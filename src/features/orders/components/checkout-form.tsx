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

import { ArrowLeft, ChevronLeft, ChevronRight, LockKeyhole, MapPin, ShoppingBag, Tag } from "lucide-react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
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
      <div role="status" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <span className="sr-only">Loading checkout...</span>
        <div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
        <h1 className="text-xl font-semibold text-rose-900">
          Could not load checkout
        </h1>
        <p role="alert" className="mt-2 text-sm text-rose-800">{error}</p>
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
        <p className="mt-3 text-[0.9375rem] text-muted">
          Add products to your cart before checkout.
        </p>

        <Link href="/products" className={buttonStyles({ size: "large", className: "mt-8 rounded-full" })}>
          Browse products
        </Link>
      </div>
    );
  }

  const label = "text-sm font-medium text-slate-800";
  const section = "rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6";
  const step = (n: number) => <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white" aria-hidden="true">{n}</span>;
  const blocked = isSubmitting || pendingMutations > 0 || needsReload;
  return (
    <form onSubmit={handleSubmit}>
      <div className="border-b border-line pb-6">
        <Link href="/cart" className="inline-flex min-h-9 items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" />Cart</Link>
        <p className="mb-eyebrow mt-4">
          Checkout · Step 2 of 2
        </p>

        <h1 className="mb-display mt-3 text-[2.5rem] text-ink sm:text-[3rem]">
          Shipping information
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted">
          Choose a saved address, apply a discount code, and place your order.
        </p>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
        <div className="min-w-0 space-y-6">
          {error ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          ) : null}

          {pendingMutations > 0 || needsReload ? (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {needsReload
                ? "Cart changes could not be synchronized. Return to the cart and reload before placing an order."
                : "Waiting for cart changes to finish before placing an order."}
            </p>
          ) : null}

          <section className={section} aria-labelledby="checkout-saved-heading">
            <div className="flex items-center gap-3">{step(1)}<h2 id="checkout-saved-heading" className="text-base font-semibold text-slate-950">Delivery address</h2></div>
            <div className="mt-5 rounded-xl bg-sunken/70 p-4">
              <label className="block">
                <span className={`${label} flex items-center gap-1.5`}>
                  <MapPin size={15} aria-hidden="true" />Saved address
                </span>

                <select
                  value={selectedAddressId}
                  onChange={handleAddressSelect}
                  disabled={addressesLoading || isSubmitting}
                  className="mt-1.5 w-full mb-control mb-select"
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

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <nav
                  aria-label="Saved address pages"
                  className="flex items-center gap-2 text-xs text-muted"
                >
                  <button
                    type="button"
                    onClick={() => handleAddressPage(addressPage - 1)}
                    disabled={addressPage === 1 || addressesLoading || isSubmitting}
                    className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface disabled:opacity-35"
                  >
                    <ChevronLeft size={14} aria-hidden="true" /><span className="sr-only">Previous saved addresses</span>
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
                    className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface disabled:opacity-35"
                  >
                    <ChevronRight size={14} aria-hidden="true" /><span className="sr-only">Next saved addresses</span>
                  </button>
                </nav>
                <Link
                  href="/addresses"
                  className="text-sm font-medium text-slate-900 underline underline-offset-4"
                >
                  Manage addresses
                </Link>
              </div>
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
                <p className="mt-3 text-sm text-muted">
                  No saved addresses yet. You can create one from the addresses page
                  or continue manually.
                </p>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={label}>
                  Receiver name
                </span>
                <input
                  name="receiver_name"
                  value={form.receiver_name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                  className="mt-1.5 w-full mb-control"
                />
              </label>

              <label className="block">
                <span className={label}>
                  Receiver phone
                </span>
                <input
                  name="receiver_phone"
                  value={form.receiver_phone}
                  onChange={handleChange}
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="09123456789"
                  className="mt-1.5 w-full mb-control"
                />
              </label>

              <label className="block">
                <span className={label}>Province</span>
                <input
                  name="province"
                  value={form.province}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={100}
                  pattern="[^0-9]*"
                  title="Use letters only. Numbers are not allowed."
                  autoComplete="address-level1"
                  className="mt-1.5 w-full mb-control"
                />
              </label>

              <label className="block">
                <span className={label}>City</span>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={100}
                  pattern="[^0-9]*"
                  title="Use letters only. Numbers are not allowed."
                  autoComplete="address-level2"
                  className="mt-1.5 w-full mb-control"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className={label}>Address</span>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  rows={3}
                  autoComplete="street-address"
                  className="mt-1.5 w-full mb-control"
                />
              </label>

              <label className="block">
                <span className={label}>
                  Postal code
                </span>
                <input
                  name="postal_code"
                  value={form.postal_code}
                  onChange={handleChange}
                  required
                  inputMode="numeric"
                  pattern="[0-9]{4,10}"
                  autoComplete="postal-code"
                  className="mt-1.5 w-full mb-control"
                />
              </label>
            </div>
          </section>

          <section className={section} aria-labelledby="checkout-discount-heading">
            <div className="flex items-center gap-3">{step(2)}<h2 id="checkout-discount-heading" className="text-base font-semibold text-slate-950">Discount</h2></div>
            <div className="mt-5">
              <label className="block">
                <span className={`${label} flex items-center gap-1.5`}>
                  <Tag size={15} aria-hidden="true" />Discount code
                </span>
                <div className="mt-1.5 flex gap-2">
                  <input
                    name="discount_code"
                    disabled={isSubmitting}
                    value={form.discount_code}
                    onChange={handleChange}
                    placeholder="SAVE10"
                    className="w-full uppercase mb-control"
                  />
                  <button
                    type="button"
                    onClick={() => void handleValidateDiscount()}
                    disabled={isValidatingDiscount || isSubmitting}
                    className="mb-btn mb-btn-secondary shrink-0"
                  >
                    {isValidatingDiscount ? "Checking..." : "Apply code"}
                  </button>
                </div>
              </label>

              {discountError ? (
                <p className="mt-2 text-sm text-danger">{discountError}</p>
              ) : null}

              {discountResult ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <div>
                    <p className="font-medium">{discountResult.title} applied</p>
                    <p className="mt-0.5">
                      Discount: {formatPrice(discountResult.discount_amount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveDiscount}
                    disabled={isSubmitting}
                    className="mb-btn mb-btn-secondary mb-btn-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className={section} aria-labelledby="checkout-note-heading">
            <div className="flex items-center gap-3">{step(3)}<h2 id="checkout-note-heading" className="text-base font-semibold text-slate-950">Note for the seller</h2></div>
            <label className="mt-5 block">
              <span className={label}>
                Customer note
              </span>
              <textarea
                name="customer_note"
                value={form.customer_note}
                onChange={handleChange}
                rows={3}
                className="mt-1.5 w-full mb-control"
              />
            </label>
          </section>
        </div>

        <aside aria-labelledby="checkout-summary-heading" className="h-fit rounded-2xl border border-line bg-surface p-6 shadow-sm lg:sticky lg:top-36">
          <h2 id="checkout-summary-heading" className="text-base font-semibold text-slate-950">Order summary</h2>

          <ul className="mt-4 divide-y divide-line">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-950">
                    {item.product_name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Quantity: {item.quantity}
                  </p>
                </div>
                <p data-numeric className="shrink-0 text-sm font-medium text-slate-900">
                  {formatPrice(item.total_price)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-2 space-y-3 border-t border-line pt-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd data-numeric className="font-medium text-slate-950">
                {formatPrice(cart.subtotal)}
              </dd>
            </div>

            {discountResult ? (
              <div className="flex items-center justify-between">
                <dt className="text-emerald-800">
                  Discount ({discountResult.code})
                </dt>
                <dd data-numeric className="font-medium text-emerald-800">
                  -{formatPrice(discountResult.discount_amount)}
                </dd>
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t border-line pt-4">
              <dt className="font-semibold text-slate-950">Total</dt>
              <dd data-numeric className="text-2xl font-semibold tracking-tight text-slate-950">
                {formatPrice(finalTotal)}
              </dd>
            </div>
          </dl>

          <Button type="submit" size="large" disabled={blocked} className="mt-6 w-full rounded-full">
            {!isSubmitting && <LockKeyhole size={16} aria-hidden="true" />}
            {isSubmitting ? "Creating order..." : "Place order"}
          </Button>
          <p className="mt-3 text-center text-xs leading-5 text-muted">You&apos;ll confirm payment on the next screen. Stock is reserved when the order is created.</p>

          <Link
            href="/cart"
            className="mt-4 w-full mb-btn mb-btn-secondary rounded-full"
          >
            Back to cart
          </Link>
        </aside>
      </div>
    </form>
  );
}
