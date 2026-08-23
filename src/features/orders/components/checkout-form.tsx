"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { getAddresses } from "@/features/addresses/api";
import type { Address } from "@/features/addresses/types";
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

function formatAddressLine(address: Address) {
  return [
    address.street,
    address.alley,
    address.building_number ? `Building ${address.building_number}` : "",
    address.floor ? `Floor ${address.floor}` : "",
    address.unit ? `Unit ${address.unit}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function mapAddressToCheckoutForm(
  address: Address,
  currentForm: CheckoutPayload,
): CheckoutPayload {
  return {
    ...currentForm,
    receiver_name: address.receiver_name,
    receiver_phone: address.receiver_phone,
    province: address.province,
    city: address.city,
    address: formatAddressLine(address),
    postal_code: address.postal_code,
  };
}

export function CheckoutForm() {
  const router = useRouter();

  const setCart = useCartStore((state) => state.setCart);
  const clearCartState = useCartStore((state) => state.clearCartState);

  const [cart, setLocalCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [form, setForm] = useState<CheckoutPayload>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCheckoutData() {
      setIsLoading(true);
      setError("");

      try {
        const [cartData, addressData] = await Promise.all([
          getCart(),
          getAddresses(),
        ]);

        if (!isMounted) {
          return;
        }

        setLocalCart(cartData);
        setCart(cartData);
        setAddresses(addressData);

        const defaultAddress = addressData.find(
          (address) => address.is_default,
        );

        if (defaultAddress) {
          setSelectedAddressId(String(defaultAddress.id));
          setForm((current) =>
            mapAddressToCheckoutForm(defaultAddress, current),
          );
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

    void loadCheckoutData();

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

  function handleAddressSelect(event: ChangeEvent<HTMLSelectElement>) {
    const addressId = event.target.value;

    setSelectedAddressId(addressId);

    if (!addressId) {
      return;
    }

    const selectedAddress = addresses.find(
      (address) => String(address.id) === addressId,
    );

    if (!selectedAddress) {
      return;
    }

    setForm((current) => mapAddressToCheckoutForm(selectedAddress, current));
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
            Choose a saved address or enter receiver details manually.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Saved address
            </span>

            <select
              value={selectedAddressId}
              onChange={handleAddressSelect}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">Enter address manually</option>

              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.title}
                  {address.is_default ? " (Default)" : ""} - {address.city}
                </option>
              ))}
            </select>
          </label>

          {!addresses.length ? (
            <p className="mt-3 text-sm text-slate-500">
              No saved addresses yet. You can create one from the addresses page
              or continue manually.
            </p>
          ) : null}

          <Link
            href="/addresses"
            className="mt-4 inline-flex text-sm font-medium text-slate-900 underline underline-offset-4"
          >
            Manage addresses
          </Link>
        </div>

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
              placeholder="09123456789"
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
              minLength={2}
              maxLength={100}
              pattern="[^0-9]*"
              title="Use letters only. Numbers are not allowed."
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
              minLength={2}
              maxLength={100}
              pattern="[^0-9]*"
              title="Use letters only. Numbers are not allowed."
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
              inputMode="numeric"
              pattern="[0-9]{4,10}"
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
