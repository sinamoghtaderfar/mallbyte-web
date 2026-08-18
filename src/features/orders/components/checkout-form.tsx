"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { getCart } from "@/features/cart/api";
import { useCartStore } from "@/features/cart/cart-store";
import type { Cart } from "@/features/cart/types";
import { getApiErrorMessage } from "@/lib/api/errors";

import { checkout } from "../api";
import type { CheckoutPayload } from "../types";

const initialForm: CheckoutPayload = {
  receiver_name: "",
  receiver_phone: "",
  province: "",
  city: "",
  address: "",
  postal_code: "",
  customer_note: "",
  discount_code: "",
  shipping_cost: 0,
};

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

export function CheckoutForm() {
  const router = useRouter();

  const setCart = useCartStore((state) => state.setCart);
  const clearCartState = useCartStore((state) => state.clearCartState);

  const [cart, setLocalCart] = useState<Cart | null>(null);
  const [form, setForm] = useState<CheckoutPayload>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCart() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getCart();

        if (isMounted) {
          setLocalCart(data);
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

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const order = await checkout({
        ...form,
        shipping_cost: 0,
      });

      clearCartState();
      router.push(`/orders/${order.id}`);
    } catch (checkoutError) {
      setError(getApiErrorMessage(checkoutError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading checkout...</p>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load checkout
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
          Add products to your cart before checkout.
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
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Checkout
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Shipping information
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter receiver details to create an order from your cart.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Receiver name
            </span>
            <input
              name="receiver_name"
              value={form.receiver_name}
              onChange={handleChange}
              required
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Receiver phone
            </span>
            <input
              name="receiver_phone"
              value={form.receiver_phone}
              onChange={handleChange}
              required
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Province</span>
            <input
              name="province"
              value={form.province}
              onChange={handleChange}
              required
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">City</span>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              required
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Postal code
            </span>
            <input
              name="postal_code"
              value={form.postal_code}
              onChange={handleChange}
              required
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Discount code
            </span>
            <input
              name="discount_code"
              value={form.discount_code}
              onChange={handleChange}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Address</span>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Customer note
            </span>
            <textarea
              name="customer_note"
              value={form.customer_note}
              onChange={handleChange}
              rows={3}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 rounded-2xl bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating order..." : "Place order"}
          </button>

          <Link
            href="/cart"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to cart
          </Link>
        </div>
      </form>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Order summary</h2>

        <div className="mt-5 divide-y divide-slate-100">
          {cart.items.map((item) => (
            <div key={item.id} className="py-4">
              <p className="text-sm font-medium text-slate-950">
                {item.product_name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Quantity: {item.quantity}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatPrice(item.total_price)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
          <p className="text-sm text-slate-500">Subtotal</p>
          <p className="text-lg font-semibold text-slate-950">
            {formatPrice(cart.subtotal)}
          </p>
        </div>
      </aside>
    </div>
  );
}
