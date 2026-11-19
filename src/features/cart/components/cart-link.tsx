"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect } from "react";

import { useAuthStore } from "@/features/auth/auth-store";

import { useCartStore } from "../cart-store";

export function CartLink() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);

  const totalItems = useCartStore((state) => state.totalItems);
  const loadCart = useCartStore((state) => state.loadCart);
  const clearCartState = useCartStore((state) => state.clearCartState);

  useEffect(() => {
    async function load() {
      if (!isBootstrapped) {
        return;
      }

      if (!isAuthenticated) {
        clearCartState();
        return;
      }

      try {
        await loadCart();
      } catch {
        /* Preserve the last known badge; the cart page exposes retries. */
      }
    }

    void load();
  }, [clearCartState, isAuthenticated, isBootstrapped, loadCart]);

  return (
    <Link
      href="/cart"
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
    >
      <ShoppingBag size={20} strokeWidth={1.8} aria-hidden="true" />
      <span className="sr-only xl:not-sr-only">Cart</span>
      {totalItems > 0 ? (
        <span className="rounded-full bg-brand px-1.5 py-0.5 text-xs font-semibold text-white">
          {totalItems}
        </span>
      ) : null}
    </Link>
  );
}
