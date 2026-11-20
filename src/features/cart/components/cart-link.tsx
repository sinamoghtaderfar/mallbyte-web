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
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-ink"
    >
      <ShoppingBag size={20} strokeWidth={1.7} aria-hidden="true" />
      <span className="sr-only xl:not-sr-only">Cart</span>
      {totalItems > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex min-w-[1.15rem] items-center justify-center rounded-full bg-brand px-1 text-[0.6875rem] font-semibold leading-[1.15rem] text-white ring-2 ring-background xl:static xl:ring-0">
          {totalItems}
        </span>
      ) : null}
    </Link>
  );
}
