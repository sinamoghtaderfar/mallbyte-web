"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getAddressesPage } from "@/features/addresses/api";
import type { Address } from "@/features/addresses/types";
import { useCartStore } from "@/features/cart/cart-store";
import { validateDiscountCode } from "@/features/discounts/api";
import type { DiscountValidationResult } from "@/features/discounts/types";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PaginatedResponse } from "@/types/api";

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

  const cart = useCartStore((state) => state.cart);
  const loadCart = useCartStore((state) => state.loadCart);
  const pendingMutations = useCartStore((state) => state.pendingMutations);
  const needsReload = useCartStore((state) => state.needsReload);
  const checkoutCart = useCartStore((state) => state.checkoutCart);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressPage, setAddressPage] = useState(1);
  const [addressPagination, setAddressPagination] = useState<
    PaginatedResponse<Address>
  >({ count: 0, next: null, previous: null, results: [] });
  const [failedAddressPage, setFailedAddressPage] = useState<number | null>(
    null,
  );
  const initialAddressLoadCompleted = useRef(false);
  const [form, setForm] = useState<CheckoutPayload>(initialForm);
  const [discountResult, setDiscountResult] =
    useState<DiscountValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [error, setError] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState("");
  const addressRequest = useRef(0);
  const discountRequest = useRef(0);
  const shippingEdited = useRef(false);

  const loadAddresses = useCallback(async (page = 1) => {
    const request = ++addressRequest.current;
    try {
      const data = await getAddressesPage(page);
      if (request !== addressRequest.current) return;
      setAddresses(data.results);
      setAddressPagination(data);
      setAddressPage(page);
      if (!initialAddressLoadCompleted.current && !shippingEdited.current) {
        const defaultAddress = data.results.find(
          (address) => address.is_default,
        );
        if (defaultAddress) {
          setSelectedAddressId(String(defaultAddress.id));
          setSelectedAddress(defaultAddress);
          setForm((current) =>
            mapAddressToCheckoutForm(defaultAddress, current),
          );
        }
      }
      initialAddressLoadCompleted.current = true;
    } catch (reason) {
      if (request === addressRequest.current) {
        setAddressesError(getApiErrorMessage(reason));
        setFailedAddressPage(page);
      }
    } finally {
      if (request === addressRequest.current) setAddressesLoading(false);
    }
  }, []);

  function handleAddressPage(page: number) {
    setAddressesLoading(true);
    setAddressesError("");
    setFailedAddressPage(null);
    void loadAddresses(page);
  }

  useEffect(() => {
    let current = true;
    void Promise.resolve().then(() => {
      if (current) return loadAddresses();
    });
    return () => {
      current = false;
      addressRequest.current += 1;
    };
  }, [loadAddresses]);

  useEffect(
    () => () => {
      discountRequest.current += 1;
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCheckoutData() {
      setIsLoading(true);
      setError("");

      try {
        await loadCart();

        if (!isMounted) {
          return;
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
  }, [loadCart]);

  const finalTotal = useMemo(() => {
    if (discountResult) {
      return discountResult.total_after_discount;
    }

    return cart?.subtotal ?? "0";
  }, [cart?.subtotal, discountResult]);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (name === "discount_code") {
      discountRequest.current += 1;
      setIsValidatingDiscount(false);
      setDiscountResult(null);
      setDiscountError("");
    } else if (
      [
        "receiver_name",
        "receiver_phone",
        "province",
        "city",
        "address",
        "postal_code",
      ].includes(name)
    ) {
      shippingEdited.current = true;
    }
  }

  function handleAddressSelect(event: ChangeEvent<HTMLSelectElement>) {
    shippingEdited.current = true;
    const addressId = event.target.value;

    setSelectedAddressId(addressId);

    if (!addressId) {
      setSelectedAddress(null);
      return;
    }

    const selectedAddress = addresses.find(
      (address) => String(address.id) === addressId,
    );

    if (!selectedAddress) {
      return;
    }

    setForm((current) => mapAddressToCheckoutForm(selectedAddress, current));
    setSelectedAddress(selectedAddress);
  }

  async function handleValidateDiscount() {
    const request = ++discountRequest.current;
    const code = form.discount_code?.trim();

    setDiscountError("");
    setDiscountResult(null);

    if (!code) {
      setDiscountError("Enter a discount code first.");
      return;
    }

    setIsValidatingDiscount(true);

    try {
      const result = await validateDiscountCode({ code });
      if (request !== discountRequest.current) return;

      setDiscountResult(result);
      setForm((current) => ({
        ...current,
        discount_code: result.code,
      }));
    } catch (validateError) {
      if (request === discountRequest.current)
        setDiscountError(getApiErrorMessage(validateError));
    } finally {
      if (request === discountRequest.current) setIsValidatingDiscount(false);
    }
  }

  function handleRemoveDiscount() {
    discountRequest.current += 1;
    setIsValidatingDiscount(false);
    setDiscountResult(null);
    setDiscountError("");
    setForm((current) => ({
      ...current,
      discount_code: "",
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentCart = useCartStore.getState();
    if (
      isSubmitting ||
      currentCart.pendingMutations > 0 ||
      currentCart.needsReload ||
      !currentCart.cart?.items.length
    )
      return;
    discountRequest.current += 1;
    setIsValidatingDiscount(false);

    setError("");
    setIsSubmitting(true);

    try {
      const order = await checkoutCart(() =>
        checkout({
          ...form,
          discount_code: form.discount_code?.trim() || "",
          shipping_cost: 0,
        }),
      );
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
            Choose a saved address, apply a discount code, and place your order.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {pendingMutations > 0 || needsReload ? (
          <p role="alert" className="mt-6 text-sm text-amber-900">
            {needsReload
              ? "Cart changes could not be synchronized. Return to the cart and reload before placing an order."
              : "Waiting for cart changes to finish before placing an order."}
          </p>
        ) : null}

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Saved address
            </span>

            <select
              value={selectedAddressId}
              onChange={handleAddressSelect}
              disabled={addressesLoading || isSubmitting}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">Enter address manually</option>
              {selectedAddress &&
              !addresses.some(
                (address) => address.id === selectedAddress.id,
              ) ? (
                <option value={selectedAddress.id}>
                  {selectedAddress.title} (Selected) - {selectedAddress.city}
                </option>
              ) : null}

              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.title}
                  {address.is_default ? " (Default)" : ""} - {address.city}
                </option>
              ))}
            </select>
          </label>

          <nav
            aria-label="Saved address pages"
            className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-700"
          >
            <button
              type="button"
              onClick={() => handleAddressPage(addressPage - 1)}
              disabled={addressPage === 1 || addressesLoading || isSubmitting}
              className="rounded-xl border px-3 py-2 disabled:opacity-50"
            >
              Previous saved addresses
            </button>
            <span>
              Page {addressPage} of{" "}
              {Math.max(1, Math.ceil(addressPagination.count / 20))} ·{" "}
              {addressPagination.count} saved addresses
            </span>
            <button
              type="button"
              onClick={() => handleAddressPage(addressPage + 1)}
              disabled={
                !addressPagination.next || addressesLoading || isSubmitting
              }
              className="rounded-xl border px-3 py-2 disabled:opacity-50"
            >
              Next saved addresses
            </button>
          </nav>
          {addressesLoading ? (
            <p className="mt-3 text-sm text-slate-600">
              Loading saved addresses… You can enter an address manually.
            </p>
          ) : null}

          {addressesError ? (
            <div role="alert" className="mt-3 text-sm text-amber-900">
              <p>
                Saved addresses could not be loaded. Enter an address manually
                or retry.
              </p>
              <p>{addressesError}</p>
              <button
                type="button"
                onClick={() =>
                  handleAddressPage(failedAddressPage ?? addressPage)
                }
                disabled={addressesLoading || isSubmitting}
                className="mt-2 font-medium underline"
              >
                Retry saved addresses
              </button>
            </div>
          ) : null}

          {!addressesLoading && !addressesError && !addresses.length ? (
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

          <div className="block">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Discount code
              </span>
              <input
                name="discount_code"
                disabled={isSubmitting}
                value={form.discount_code}
                onChange={handleChange}
                placeholder="SAVE10"
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm uppercase outline-none transition focus:border-slate-400"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleValidateDiscount()}
                disabled={isValidatingDiscount || isSubmitting}
                className="h-10 rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isValidatingDiscount ? "Checking..." : "Apply code"}
              </button>

              {discountResult ? (
                <button
                  type="button"
                  onClick={handleRemoveDiscount}
                  disabled={isSubmitting}
                  className="h-10 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Remove
                </button>
              ) : null}
            </div>

            {discountError ? (
              <p className="mt-2 text-sm text-red-600">{discountError}</p>
            ) : null}

            {discountResult ? (
              <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <p className="font-medium">{discountResult.title} applied</p>
                <p className="mt-1">
                  Discount: {formatPrice(discountResult.discount_amount)}
                </p>
              </div>
            ) : null}
          </div>

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
            disabled={isSubmitting || pendingMutations > 0 || needsReload}
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

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Subtotal</p>
            <p className="text-sm font-medium text-slate-950">
              {formatPrice(cart.subtotal)}
            </p>
          </div>

          {discountResult ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-green-700">
                Discount ({discountResult.code})
              </p>
              <p className="text-sm font-medium text-green-700">
                -{formatPrice(discountResult.discount_amount)}
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-950">Total</p>
            <p className="text-lg font-semibold text-slate-950">
              {formatPrice(finalTotal)}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
