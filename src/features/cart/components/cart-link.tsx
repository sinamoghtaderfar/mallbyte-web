"use client";

import Link from "next/link";
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
      className="relative inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      Cart
      {totalItems > 0 ? (
        <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
          {totalItems}
        </span>
      ) : null}
    </Link>
  );
}
