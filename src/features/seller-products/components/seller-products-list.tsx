"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ProductListItem } from "@/features/products/types";
import { getApiErrorMessage } from "@/lib/api/errors";

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

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getSellerProducts();

        if (isMounted) {
          setProducts(data);
        }
      } catch (productsError) {
        if (isMounted) {
          setError(getApiErrorMessage(productsError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading seller products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load seller products
        </h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>

        <Link
          href="/seller/dashboard"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Seller products
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Manage products
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            View products submitted by your seller account and create new ones.
          </p>
        </div>

        <Link
          href="/seller/products/new"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          New product
        </Link>
      </div>

      {!products.length ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 p-8">
          <h2 className="text-xl font-semibold text-slate-950">
            No products yet
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Create your first seller product and submit it for approval.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200">
          <div className="grid grid-cols-[1fr_140px_120px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            <span>Product</span>
            <span>Price</span>
            <span>Stock</span>
          </div>

          <div className="divide-y divide-slate-100">
            {products.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-[1fr_140px_120px] gap-4 px-5 py-4"
              >
                <div>
                  <Link
                    href={`/seller/products/${product.id}`}
                    className="text-sm font-semibold text-slate-950 underline-offset-4 hover:underline"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {product.category_name || "No category"} ·{" "}
                    {product.brand_name || "No brand"}
                  </p>
                </div>

                <p className="text-sm font-medium text-slate-900">
                  {formatPrice(product.final_price)}
                </p>

                <p className="text-sm text-slate-600">
                  {product.available_stock} available
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/seller/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
