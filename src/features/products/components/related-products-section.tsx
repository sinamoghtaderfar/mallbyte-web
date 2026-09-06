"use client";

import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getRelatedProducts } from "../api";
import type { ProductListItem } from "../types";
import { ProductCard } from "./product-card";

type RelatedProductsSectionProps = {
  productId: number | string;
};

export function RelatedProductsSection({
  productId,
}: RelatedProductsSectionProps) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRelatedProducts() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getRelatedProducts(String(productId));

        if (isMounted) {
          setProducts(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRelatedProducts();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Related products
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            You may also like
          </h2>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">
          Loading related products...
        </p>
      ) : null}

      {!isLoading && error ? (
        <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && !products.length ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 p-6">
          <h3 className="text-lg font-semibold text-slate-950">
            No related products yet
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Related products will appear here when similar products are
            available.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && products.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
