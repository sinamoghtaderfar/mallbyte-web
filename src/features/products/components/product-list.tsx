"use client";

import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getProducts } from "../api";
import type { ProductListItem } from "../types";
import { ProductCard } from "./product-card";

export function ProductList() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getProducts();

        if (isMounted) {
          setProducts(data.results);
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

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-red-800">
          Could not load products
        </h2>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          No products yet
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Products will appear here once they are available from the backend.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
