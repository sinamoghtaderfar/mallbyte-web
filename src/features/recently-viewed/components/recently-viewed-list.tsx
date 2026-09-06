"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getRecentlyViewedProducts } from "@/features/products/api";
import type { RecentlyViewedProduct } from "@/features/products/types";

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

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getImageUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function RecentlyViewedList() {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRecentlyViewed() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getRecentlyViewedProducts();

        if (isMounted) {
          setItems(data);
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

    void loadRecentlyViewed();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">
          Loading recently viewed products...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load recently viewed products
        </h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Recently viewed
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Browsing history
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Products you opened recently while browsing MallByte.
        </p>
      </div>

      {!items.length ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 p-8">
          <h2 className="text-xl font-semibold text-slate-950">
            No recently viewed products
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Open product detail pages and they will appear here.
          </p>

          <Link
            href="/products"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {items.map((item) => {
            const imageUrl = getImageUrl(item.product_image);

            return (
              <Link
                key={item.id}
                href={`/products/${item.product}`}
                className="grid gap-4 rounded-3xl border border-slate-200 p-4 transition hover:bg-slate-50 sm:grid-cols-[120px_1fr_auto]"
              >
                <div
                  className="flex aspect-square items-center justify-center rounded-2xl bg-slate-100 bg-cover bg-center"
                  style={
                    imageUrl
                      ? { backgroundImage: `url(${imageUrl})` }
                      : undefined
                  }
                >
                  {!imageUrl ? (
                    <span className="text-xs text-slate-400">No image</span>
                  ) : null}
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    {item.product_name}
                  </h2>

                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {formatPrice(item.product_price)}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Viewed at {formatDate(item.viewed_at)}
                  </p>
                </div>

                <p className="text-sm font-medium text-slate-500 sm:text-right">
                  View product →
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
