"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuthStore } from "@/features/auth/auth-store";
import { getApiErrorMessage } from "@/lib/api/errors";

import { addToCart } from "../api";
import { useCartStore } from "../cart-store";

type AddToCartButtonProps = {
  productId: number;
  disabled?: boolean;
};

export function AddToCartButton({ productId, disabled }: AddToCartButtonProps) {
  const router = useRouter();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setCart = useCartStore((state) => state.setCart);

  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  async function handleAddToCart() {
    setError("");

    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    setIsAdding(true);

    try {
      const cart = await addToCart({
        product: productId,
        quantity: 1,
      });

      setCart(cart);
      router.push("/cart");
    } catch (addError) {
      setError(getApiErrorMessage(addError));
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={disabled || isAdding}
        className="h-12 rounded-2xl bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAdding ? "Adding..." : "Add to cart"}
      </button>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
