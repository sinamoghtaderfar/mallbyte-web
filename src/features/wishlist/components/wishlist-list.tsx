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
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading wishlist...</p>
      </div>
    );
  }

  if (error && !items.length) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-8 shadow-sm">
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
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
      <div>
        <p className="mb-eyebrow">
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
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-8 text-center sm:p-12">
          <h2 className="text-xl font-semibold text-slate-950">
            Your wishlist is empty
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Save products from the product detail page.
          </p>

          <Link
            href="/products"
            className="mt-6 mb-btn mb-btn-primary"
          >
            Browse products
          </Link>
        </div>
      ) : !error ? (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3">
          {items.map((item) => {
            const imageUrl = getImageUrl(item.product_image);

            return (
              <li key={item.id} className="group min-w-0">
                <Link href={`/products/${item.product}`} tabIndex={-1} aria-hidden="true" className="block aspect-[4/5] overflow-hidden rounded-2xl bg-sunken">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-xs text-slate-500">No image</span>
                  )}
                </Link>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${item.product}`}
                      className="line-clamp-2 text-[0.9375rem] font-medium leading-snug text-slate-950 underline-offset-4 hover:underline"
                    >
                      {item.product_name}
                    </Link>

                    <p data-numeric className="mt-1 text-sm font-semibold text-slate-900">
                      {formatPrice(item.product_price)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoveItem(item.id)}
                  disabled={removingItemId !== null}
                  className="mt-3 w-full mb-btn mb-btn-secondary mb-btn-sm rounded-full hover:text-rose-700"
                >
                  {removingItemId === item.id ? "Removing..." : "Remove"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <nav
        aria-label="Wishlist pages"
        className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-700"
      >
        <button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page === 1 || removingItemId !== null}
          className="mb-btn mb-btn-secondary mb-btn-sm"
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
          className="mb-btn mb-btn-secondary mb-btn-sm"
        >
          Next
        </button>
      </nav>
    </section>
  );
}
