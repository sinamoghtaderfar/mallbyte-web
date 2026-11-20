"use client";

import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getRelatedProducts } from "../api";
import type { ProductListItem } from "../types";
import { ProductCard, ProductCardSkeleton } from "./product-card";

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
    <section aria-labelledby="related-products-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-eyebrow">
            Related products
          </p>

          <h2 id="related-products-heading" className="mb-display mt-3 text-[2.25rem] text-ink">
            You may also <span className="italic">like</span>
          </h2>
        </div>
      </div>

      {isLoading ? (
        <div role="status" className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          <span className="sr-only">Loading related products...</span>
          {Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)}
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && !products.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-8 text-center">
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
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
