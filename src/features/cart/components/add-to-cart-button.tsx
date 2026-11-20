"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useAuthStore } from "@/features/auth/auth-store";
import { getApiErrorMessage } from "@/lib/api/errors";

import { useCartStore } from "../cart-store";

type AddToCartButtonProps = {
  productId: number;
  disabled?: boolean;
};

export function AddToCartButton({ productId, disabled }: AddToCartButtonProps) {
  const router = useRouter();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addProduct = useCartStore((state) => state.addProduct);

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
      await addProduct({
        product: productId,
        quantity: 1,
      });

      router.push("/cart");
    } catch (addError) {
      setError(getApiErrorMessage(addError));
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="min-w-0">
      <Button
        size="large"
        onClick={handleAddToCart}
        disabled={disabled}
        loading={isAdding}
        className="w-full rounded-full"
      >
        {!isAdding && <ShoppingBag size={18} aria-hidden="true" />}
        {isAdding ? "Adding..." : "Add to cart"}
      </Button>

      {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
