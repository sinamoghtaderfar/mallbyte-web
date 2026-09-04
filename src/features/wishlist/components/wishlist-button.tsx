"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/features/auth/auth-store";
import { getApiErrorMessage } from "@/lib/api/errors";

import { addToWishlist, getWishlist, removeWishlistItem } from "../api";
import type { WishlistItem } from "../types";

type WishlistButtonProps = {
  productId: number;
};

export function WishlistButton({ productId }: WishlistButtonProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);

  const [wishlistItem, setWishlistItem] = useState<WishlistItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadWishlistState() {
      if (!isBootstrapped || !isAuthenticated) {
        return;
      }

      setError("");

      try {
        const items = await getWishlist();
        const matchingItem =
          items.find((item) => item.product === productId) ?? null;

        if (isMounted) {
          setWishlistItem(matchingItem);
        }
      } catch {
        if (isMounted) {
          setWishlistItem(null);
        }
      }
    }

    void loadWishlistState();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isBootstrapped, productId]);

  async function handleToggleWishlist() {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      if (wishlistItem) {
        await removeWishlistItem(wishlistItem.id);
        setWishlistItem(null);
      } else {
        const createdItem = await addToWishlist({ product: productId });
        setWishlistItem(createdItem);
      }
    } catch (wishlistError) {
      setError(getApiErrorMessage(wishlistError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggleWishlist}
        disabled={isLoading}
        className="h-12 rounded-2xl border border-slate-200 px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading
          ? "Saving..."
          : wishlistItem
            ? "Remove from wishlist"
            : "Add to wishlist"}
      </button>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
