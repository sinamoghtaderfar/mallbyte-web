"use client";

import { getImageUrl } from "@/lib/media/image-url";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getWishlistPage, removeWishlistItem } from "../api";
import type { PaginatedResponse } from "@/types/api";
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

export function WishlistList() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [pagination, setPagination] = useState<PaginatedResponse<WishlistItem>>(
    {
      count: 0,
      next: null,
      previous: null,
      results: [],
    },
  );
  const [isLoading, setIsLoading] = useState(true);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadWishlist() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getWishlistPage(page, controller.signal);

        if (isMounted) {
          const lastPage = Math.max(1, Math.ceil(data.count / 20));
          if (page > lastPage) {
            setPage(lastPage);
            return;
          }
          setItems(data.results);
          setPagination(data);
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
      controller.abort();
    };
  }, [page, reload]);

  async function handleRemoveItem(itemId: number) {
    setError("");
    setRemovingItemId(itemId);

    try {
      await removeWishlistItem(itemId);
      if (items.length === 1 && page > 1) setPage(page - 1);
      else setReload((value) => value + 1);
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
        <button
          type="button"
          onClick={() => setReload((value) => value + 1)}
          className="mt-4 text-sm underline"
        >
          Retry wishlist
        </button>
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

      <p className="mt-4 text-sm text-slate-600">
        {pagination.count} saved products
      </p>

      {error ? (
        <button
          type="button"
          onClick={() => setReload((value) => value + 1)}
          className="mt-4 text-sm underline"
        >
          Retry wishlist
        </button>
      ) : null}

      {!error && !items.length ? (
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
      ) : !error ? (
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
                  disabled={removingItemId !== null}
                  className="h-11 rounded-2xl border border-red-200 px-5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {removingItemId === item.id ? "Removing..." : "Remove"}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <nav
        aria-label="Wishlist pages"
        className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-700"
      >
        <button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page === 1 || removingItemId !== null}
          className="rounded-xl border px-4 py-2 disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.max(1, Math.ceil(pagination.count / 20))}
        </span>
        <button
          type="button"
          onClick={() => setPage(page + 1)}
          disabled={
            !pagination.next || Boolean(error) || removingItemId !== null
          }
          className="rounded-xl border px-4 py-2 disabled:opacity-50"
        >
          Next
        </button>
      </nav>
    </section>
  );
}
