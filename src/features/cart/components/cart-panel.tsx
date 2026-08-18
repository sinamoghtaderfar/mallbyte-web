"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { clearCart, getCart, removeCartItem, updateCartItem } from "../api";
import { useCartStore } from "../cart-store";
import type { CartItem } from "../types";

function formatPrice(value: string | null | undefined) {
  if (!value) {
    return "0";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function CartPanel() {
  const cart = useCartStore((state) => state.cart);
  const setCart = useCartStore((state) => state.setCart);
  const clearCartState = useCartStore((state) => state.clearCartState);

  const [isLoading, setIsLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCart() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getCart();

        if (isMounted) {
          setCart(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCart();

    return () => {
      isMounted = false;
    };
  }, [setCart]);

  async function handleQuantityChange(item: CartItem, quantity: number) {
    if (quantity < 1) {
      return;
    }

    setActiveItemId(item.id);
    setError("");

    try {
      const updatedCart = await updateCartItem(item.id, {
        quantity,
      });

      setCart(updatedCart);
    } catch (updateError) {
      setError(getApiErrorMessage(updateError));
    } finally {
      setActiveItemId(null);
    }
  }

  async function handleRemoveItem(itemId: number) {
    setActiveItemId(itemId);
    setError("");

    try {
      const updatedCart = await removeCartItem(itemId);

      setCart(updatedCart);
    } catch (removeError) {
      setError(getApiErrorMessage(removeError));
    } finally {
      setActiveItemId(null);
    }
  }

  async function handleClearCart() {
    setError("");

    try {
      await clearCart();
      clearCartState();
    } catch (clearError) {
      setError(getApiErrorMessage(clearError));
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading cart...</p>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load cart
        </h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">
          Your cart is empty
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Add products to your cart and they will appear here.
        </p>

        <Link
          href="/products"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Shopping cart
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {cart.total_items} item{cart.total_items === 1 ? "" : "s"} in cart
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearCart}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear cart
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="divide-y divide-slate-100">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {item.product_name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  SKU: {item.product_sku}
                </p>

                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatPrice(item.unit_price)} each
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-11 items-center rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    disabled={activeItemId === item.id || item.quantity <= 1}
                    onClick={() =>
                      handleQuantityChange(item, item.quantity - 1)
                    }
                    className="h-11 px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    -
                  </button>

                  <span className="min-w-10 text-center text-sm font-semibold text-slate-950">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    disabled={
                      activeItemId === item.id ||
                      item.quantity >= item.available_stock
                    }
                    onClick={() =>
                      handleQuantityChange(item, item.quantity + 1)
                    }
                    className="h-11 px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <p className="min-w-24 text-right text-sm font-semibold text-slate-950">
                  {formatPrice(item.total_price)}
                </p>

                <button
                  type="button"
                  disabled={activeItemId === item.id}
                  onClick={() => handleRemoveItem(item.id)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Summary</h2>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
          <p className="text-sm text-slate-500">Subtotal</p>
          <p className="text-lg font-semibold text-slate-950">
            {formatPrice(cart.subtotal)}
          </p>
        </div>

        <Link href="/checkout"
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-800"
          >
          Continue to checkout
        </Link>

        <Link
          href="/products"
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
