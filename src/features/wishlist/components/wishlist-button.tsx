"use client";

import { Heart } from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/features/auth/auth-store";
import { getApiErrorMessage } from "@/lib/api/errors";

import { addToWishlist, getWishlistPage, removeWishlistItem } from "../api";
import type { WishlistItem } from "../types";

type WishlistButtonProps = { productId: number };
type Membership = "unknown" | "saved" | "unsaved";

export function WishlistButton({ productId }: WishlistButtonProps) {
  const userId = useAuthStore((state) => state.user?.id);
  return (
    <WishlistMembershipButton
      key={`${userId}:${productId}`}
      productId={productId}
    />
  );
}

function WishlistMembershipButton({ productId }: WishlistButtonProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const userId = useAuthStore((state) => state.user?.id);
  const context = `${userId}:${productId}`;
  const requestVersion = useRef(0);
  const [wishlistItem, setWishlistItem] = useState<WishlistItem | null>(null);
  const [membership, setMembership] = useState<Membership>("unknown");
  const [nextPage, setNextPage] = useState(1);
  const [checked, setChecked] = useState(0);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedContext, setLoadedContext] = useState("");
  const [error, setError] = useState("");

  const checkPage = useCallback(
    async (page: number) => {
      const version = ++requestVersion.current;
      try {
        const result = await getWishlistPage(page);
        if (version !== requestVersion.current) return;
        const item =
          result.results.find((entry) => entry.product === productId) ?? null;
        setWishlistItem(item);
        setMembership(item ? "saved" : result.next ? "unknown" : "unsaved");
        setNextPage(page + 1);
        setChecked(
          Math.min((page - 1) * 20 + result.results.length, result.count),
        );
        setCount(result.count);
        setError("");
      } catch (reason) {
        if (version !== requestVersion.current) return;
        setMembership("unknown");
        setError(getApiErrorMessage(reason));
      } finally {
        if (version === requestVersion.current) {
          setLoadedContext(context);
          setIsLoading(false);
        }
      }
    },
    [productId, context],
  );

  useEffect(() => {
    if (!isBootstrapped || !isAuthenticated) return;
    let active = true;
    queueMicrotask(() => {
      if (active) void checkPage(1);
    });
    return () => {
      active = false;
      requestVersion.current += 1;
    };
  }, [isAuthenticated, isBootstrapped, userId, checkPage]);

  async function handleToggleWishlist() {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }
    if (membership === "unknown") {
      setIsLoading(true);
      setError("");
      await checkPage(nextPage);
      return;
    }
    const version = ++requestVersion.current;
    setError("");
    setIsLoading(true);
    try {
      if (wishlistItem) {
        await removeWishlistItem(wishlistItem.id);
        if (version !== requestVersion.current) return;
        setWishlistItem(null);
        setMembership("unsaved");
      } else {
        const item = await addToWishlist({ product: productId });
        if (version !== requestVersion.current) return;
        setWishlistItem(item);
        setMembership("saved");
      }
    } catch (reason) {
      if (version === requestVersion.current)
        setError(getApiErrorMessage(reason));
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleToggleWishlist()}
        disabled={isAuthenticated && (isLoading || loadedContext !== context)}
        data-saved={isAuthenticated && membership === "saved" ? "true" : undefined}
        className="mb-button min-h-12 w-full rounded-full border border-line-strong/80 bg-surface px-6 text-[0.9375rem] font-medium text-slate-800 shadow-xs transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 data-saved:border-ember-200 data-saved:bg-ember-50 data-saved:text-ember-800"
      >
        <Heart size={18} aria-hidden="true" className={membership === "saved" && isAuthenticated ? "fill-current" : ""} />
        {!isAuthenticated
          ? "Add to wishlist"
          : isLoading || loadedContext !== context
            ? "Checking wishlist…"
            : membership === "saved"
              ? "Remove from wishlist"
              : membership === "unsaved"
                ? "Add to wishlist"
                : error
                  ? "Retry saved status"
                  : "Check more saved items"}
      </button>
      {isAuthenticated &&
      membership === "unknown" &&
      !isLoading &&
      loadedContext === context ? (
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {checked
            ? `Checked ${checked} of ${count} saved products. This product may be in your other saved items. `
            : "Saved status has not been confirmed. "}
          <Link href="/wishlist" className="underline">
            View wishlist
          </Link>
        </p>
      ) : null}
      {error && loadedContext === context ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
