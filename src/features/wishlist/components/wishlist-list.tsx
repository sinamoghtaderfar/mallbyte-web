"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getWishlist, removeWishlistItem } from "../api";
import type { WishlistItem } from "../types";

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

export function WishlistList() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadWishlist() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getWishlist();

        if (isMounted) {
          setItems(data);
        }
      } catch (wishlistError) {
        if (isMounted) {
          setError(getApiErrorMessage(wishlistError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadWishlist();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRemoveItem(itemId: number) {
    setError("");
    setRemovingItemId(itemId);

    try {
      await removeWishlistItem(itemId);
      setItems((current) => current.filter((item) => item.id !== itemId));
    } catch (removeError) {
      setError(getApiErrorMessage(removeError));
    } finally {
      setRemovingItemId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading wishlist...</p>
      </div>
    );
  }

  if (error && !items.length) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load wishlist
        </h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Wishlist
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Saved products
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Products you saved for later.
        </p>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!items.length ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 p-8">
          <h2 className="text-xl font-semibold text-slate-950">
            Your wishlist is empty
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Save products from the product detail page.
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
              <div
                key={item.id}
                className="grid gap-4 rounded-3xl border border-slate-200 p-4 sm:grid-cols-[120px_1fr_auto]"
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
                  <Link
                    href={`/products/${item.product}`}
                    className="text-lg font-semibold text-slate-950 underline-offset-4 hover:underline"
                  >
                    {item.product_name}
                  </Link>

                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {formatPrice(item.product_price)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleRemoveItem(item.id)}
                  disabled={removingItemId === item.id}
                  className="h-11 rounded-2xl border border-red-200 px-5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {removingItemId === item.id ? "Removing..." : "Remove"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
