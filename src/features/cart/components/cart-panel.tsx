"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ArrowRight, LockKeyhole, RotateCcw, ShoppingBag, Trash2, Truck } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

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
  const loadCart = useCartStore((state) => state.loadCart);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const emptyCart = useCartStore((state) => state.emptyCart);
  const pendingMutations = useCartStore((state) => state.pendingMutations);
  const needsReload = useCartStore((state) => state.needsReload);

  const [isLoading, setIsLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        await loadCart();
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

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadCart]);

  async function handleQuantityChange(item: CartItem, quantity: number) {
    if (quantity < 1) {
      return;
    }

    setActiveItemId(item.id);
    setError("");

    try {
      await updateItem(item.id, {
        quantity,
      });
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
      await removeItem(itemId);
    } catch (removeError) {
      setError(getApiErrorMessage(removeError));
    } finally {
      setActiveItemId(null);
    }
  }

  async function handleClearCart() {
    if (isClearing) return;
    setIsClearing(true);
    setError("");

    try {
      await emptyCart();
      setError("");
    } catch (clearError) {
      setError(getApiErrorMessage(clearError));
    } finally {
      setIsClearing(false);
    }
  }

  async function handleReload() {
    setIsLoading(true);
    setError("");
    try {
      await loadCart();
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div role="status" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <span className="sr-only">Loading cart...</span>
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
        <h1 className="text-xl font-semibold text-rose-900">
          Could not load cart
        </h1>
        <p role="alert" className="mt-2 text-sm text-rose-800">{error}</p>
        <button
          type="button"
          onClick={() => void handleReload()}
          className="mt-5 mb-btn mb-btn-secondary"
        >
          <RotateCcw size={15} aria-hidden="true" />Reload cart
        </button>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-8 ring-slate-50" aria-hidden="true"><ShoppingBag size={26} strokeWidth={1.6} /></span>
        <h1 className="mb-display mt-8 text-[2.5rem] text-ink">
          Your cart is empty
        </h1>

        <p className="mt-3 text-[0.9375rem] leading-7 text-muted">
          Add products to your cart and they will appear here.
        </p>

        <Link href="/products" className={buttonStyles({ size: "large", className: "mt-8 rounded-full" })}>
          Browse products<ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const blocked = pendingMutations > 0 || needsReload;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="mb-eyebrow">Checkout · Step 1 of 2</p>
          <h1 className="mb-display mt-3 text-[2.5rem] text-ink sm:text-[3rem]">
            Shopping cart
          </h1>
          <p className="mt-1 text-sm text-muted">
            {cart.total_items} item{cart.total_items === 1 ? "" : "s"} in cart
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearCart}
          disabled={isClearing}
          className="mb-btn mb-btn-secondary mb-btn-sm rounded-full"
        >
          <Trash2 size={14} aria-hidden="true" />{isClearing ? "Clearing…" : "Clear cart"}
        </button>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
        <section aria-label="Cart items" className="min-w-0">
          {error ? (
            <div aria-live="polite" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          ) : null}
          {needsReload ? (
            <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Cart changes could not be synchronized. Reload before checkout.
              <button
                type="button"
                onClick={() => void handleReload()}
                disabled={pendingMutations > 0}
                className="ml-2 font-medium underline"
              >
                Reload cart
              </button>
            </div>
          ) : null}

          <ul className="divide-y divide-line">
            {cart.items.map((item) => (
              <li key={item.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-6 first:pt-0 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                <Link href={`/products/${item.product}`} aria-hidden="true" tabIndex={-1} className="flex aspect-square items-center justify-center rounded-xl bg-sunken text-xl font-semibold uppercase text-slate-500 ring-1 ring-inset ring-black/[0.04]">
                  {item.product_name.slice(0, 1)}
                </Link>
                <div className="min-w-0">
                  <h2 className="text-base font-medium leading-snug text-slate-950">
                    <Link href={`/products/${item.product}`} className="underline-offset-4 hover:underline">{item.product_name}</Link>
                  </h2>

                  <p className="mt-1 text-xs text-muted">
                    SKU: {item.product_sku}
                  </p>

                  <p data-numeric className="mt-2 text-sm text-slate-700">
                    {formatPrice(item.unit_price)} each
                  </p>
                  {item.available_stock <= 5 ? <p className="mt-1 text-xs font-medium text-amber-800">Only {item.available_stock} available</p> : null}
                </div>

                <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
                  <p data-numeric className="order-last text-base font-semibold text-slate-950 sm:order-none">
                    {formatPrice(item.total_price)}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 items-center rounded-full border border-line-strong/80 bg-surface">
                      <button
                        type="button"
                        disabled={
                          pendingMutations > 0 ||
                          activeItemId === item.id ||
                          item.quantity <= 1
                        }
                        onClick={() =>
                          handleQuantityChange(item, item.quantity - 1)
                        }
                        className="flex size-10 items-center justify-center rounded-full text-base font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        -
                      </button>

                      <span data-numeric aria-label={`Quantity ${item.quantity}`} className="min-w-8 text-center text-sm font-semibold text-slate-950">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        disabled={
                          activeItemId === item.id ||
                          pendingMutations > 0 ||
                          item.quantity >= item.available_stock
                        }
                        onClick={() =>
                          handleQuantityChange(item, item.quantity + 1)
                        }
                        className="flex size-10 items-center justify-center rounded-full text-base font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={pendingMutations > 0 || activeItemId === item.id}
                      onClick={() => handleRemoveItem(item.id)}
                      className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-rose-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside aria-labelledby="cart-summary-heading" className="h-fit rounded-2xl border border-line bg-surface p-6 shadow-sm lg:sticky lg:top-36">
          <h2 id="cart-summary-heading" className="text-base font-semibold text-slate-950">Order summary</h2>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Items</dt>
              <dd data-numeric className="text-slate-900">{cart.total_items}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Shipping & discounts</dt>
              <dd className="text-slate-700">Calculated at checkout</dd>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-4">
              <dt className="font-medium text-slate-900">Subtotal</dt>
              <dd data-numeric className="text-xl font-semibold tracking-tight text-slate-950">
                {formatPrice(cart.subtotal)}
              </dd>
            </div>
          </dl>

          <Link
            href="/checkout"
            aria-disabled={blocked}
            onClick={(event) => {
              if (blocked) event.preventDefault();
            }}
            className={buttonStyles({ size: "large", className: `mt-6 w-full rounded-full ${blocked ? "pointer-events-none opacity-45" : ""}` })}
          >
            <LockKeyhole size={16} aria-hidden="true" />Continue to checkout
          </Link>

          <Link
            href="/products"
            className="mt-3 w-full mb-btn mb-btn-secondary rounded-full"
          >
            Continue shopping
          </Link>

          <ul className="mt-6 space-y-2.5 border-t border-line pt-5 text-xs text-muted">
            <li className="flex items-center gap-2"><LockKeyhole size={14} aria-hidden="true" />Payment is confirmed before fulfilment</li>
            <li className="flex items-center gap-2"><Truck size={14} aria-hidden="true" />Track shipments from your orders</li>
            <li className="flex items-center gap-2"><RotateCcw size={14} aria-hidden="true" />Request returns for eligible orders</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
