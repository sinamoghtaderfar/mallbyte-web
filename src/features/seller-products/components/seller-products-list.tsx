"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { ProductListItem } from "@/features/products/types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getImageUrl } from "@/lib/media/image-url";
import type { PaginatedResponse } from "@/types/api";

import { getSellerProducts } from "../api";

function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "0";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function SellerProductsList() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [pagination, setPagination] = useState<PaginatedResponse<ProductListItem>>({
    count: 0, next: null, previous: null, results: [],
  });
  const requestVersion = useRef(0);

  function changePage(next: number) {
    requestVersion.current += 1;
    setIsLoading(true);
    setError("");
    setPage(next);
  }

  useEffect(() => {
    let isMounted = true;
    const version = ++requestVersion.current;
    const controller = new AbortController();
    const current = () => isMounted && version === requestVersion.current;

    async function loadProducts() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getSellerProducts(page, controller.signal);

        if (current()) {
          setProducts(data.results);
          setPagination(data);
        }
      } catch (productsError) {
        if (current()) {
          setError(getApiErrorMessage(productsError));
        }
      } finally {
        if (current()) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [page, retry]);

  const pager = (
    <nav aria-label="Seller product pages" className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-700">
      <span>{pagination.count} products · Page {page} of {Math.max(1, Math.ceil(pagination.count / 20))}</span>
      <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)} className="mb-btn mb-btn-secondary mb-btn-sm">Previous products</button>
      <button type="button" disabled={isLoading || Boolean(error) || !pagination.next} onClick={() => changePage(page + 1)} className="mb-btn mb-btn-secondary mb-btn-sm">Next products</button>
    </nav>
  );

  if (isLoading) {
    return (
      <div className="mb-card p-5 sm:p-6 sm:p-8 shadow-sm">
        <p className="text-sm text-muted">Loading seller products...</p>
        {pager}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load seller products
        </h1>
        <p className="mt-2 text-sm text-danger">{error}</p>
        <button type="button" onClick={() => { requestVersion.current += 1; setIsLoading(true); setRetry((value) => value + 1); }} className="mt-4 rounded-xl border px-3 py-2 text-sm">Retry products</button>
        {pager}

        <Link
          href="/seller/dashboard"
          className="mt-6 mb-btn mb-btn-primary"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <section className="mb-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-eyebrow">
            Seller products
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Manage products
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted">
            View products submitted by your seller account and create new ones.
          </p>
        </div>

        <Link
          href="/seller/products/new"
          className="mb-btn mb-btn-primary"
        >
          New product
        </Link>
      </div>

      {pager}

      {!products.length ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 p-5 sm:p-8">
          <h2 className="text-xl font-semibold text-foreground">
            No products yet
          </h2>
          <p className="mt-2 text-sm text-muted">
            Create your first seller product and submit it for approval.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line">
          <table className="mb-table min-w-[36rem]">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col" className="!text-right">Price</th>
                <th scope="col">Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const img = getImageUrl(product.main_image);
                const tone = product.available_stock <= 0 ? "bg-rose-500" : product.available_stock <= 5 ? "bg-amber-500" : "bg-emerald-500";
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-sunken ring-1 ring-inset ring-black/[0.05]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img ? <img src={img} alt="" loading="lazy" className="size-full object-cover" /> : null}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/seller/products/${product.id}`}
                            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {product.name}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted">
                            {product.category_name || "No category"} ·{" "}
                            {product.brand_name || "No brand"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right font-medium text-slate-900">
                      {formatPrice(product.final_price)}
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <span className={`size-1.5 rounded-full ${tone}`} aria-hidden="true" />
                        {product.available_stock} available
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/seller/dashboard"
          className="mb-btn mb-btn-secondary"
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
