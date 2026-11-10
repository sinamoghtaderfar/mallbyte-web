"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import {
  createAddress,
  deleteAddress,
  getAddressesPage,
  setDefaultAddress,
} from "../api";
import type { Address, AddressPayload } from "../types";
import type { PaginatedResponse } from "@/types/api";

const initialForm: AddressPayload = {
  title: "",
  province: "",
  city: "",
  street: "",
  alley: "",
  building_number: "",
  floor: "",
  unit: "",
  postal_code: "",
  receiver_name: "",
  receiver_phone: "",
  is_default: false,
};

export function AddressManager() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [pagination, setPagination] = useState<PaginatedResponse<Address>>({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  const [form, setForm] = useState<AddressPayload>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAddressId, setActiveAddressId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadInitialAddresses() {
      setIsLoading(true);
      setLoadError("");
      try {
        const data = await getAddressesPage(page, controller.signal);

        if (isMounted) {
          const lastPage = Math.max(1, Math.ceil(data.count / 20));
          if (page > lastPage) {
            setPage(lastPage);
            return;
          }
          setAddresses(data.results);
          setPagination(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setLoadError(getApiErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialAddresses();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [page, refresh]);
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      await createAddress(form);
      setForm(initialForm);
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (createError) {
      setError(getApiErrorMessage(createError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(addressId: number) {
    setError("");
    setActiveAddressId(addressId);

    try {
      await deleteAddress(addressId);
      if (addresses.length === 1 && page > 1) setPage(page - 1);
      else setRefresh((value) => value + 1);
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setActiveAddressId(null);
    }
  }

  async function handleSetDefault(addressId: number) {
    setError("");
    setActiveAddressId(addressId);

    try {
      await setDefaultAddress(addressId);
      // The backend sorts default addresses first, so the changed record moves.
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (defaultError) {
      setError(getApiErrorMessage(defaultError));
    } finally {
      setActiveAddressId(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <form
        onSubmit={handleSubmit}
        className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-slate-950">Add address</h1>

        <p className="mt-2 text-sm text-slate-500">
          Save a delivery address for future checkout.
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4">
          <label>
            <span className="text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </span>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="Home"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-slate-700">
                Province <span className="text-red-500">*</span>
              </span>
              <input
                name="province"
                value={form.province}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={100}
                pattern="[^0-9]*"
                title="Use letters only. Numbers are not allowed."
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-slate-700">
                City <span className="text-red-500">*</span>
              </span>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={100}
                pattern="[^0-9]*"
                title="Use letters only. Numbers are not allowed."
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <label>
            <span className="text-sm font-medium text-slate-700">
              Street <span className="text-red-500">*</span>
            </span>
            <input
              name="street"
              value={form.street}
              onChange={handleChange}
              required
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-slate-700">Alley</span>
              <input
                name="alley"
                value={form.alley}
                onChange={handleChange}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-slate-700">
                Building / Plate number <span className="text-red-500">*</span>
              </span>
              <input
                name="building_number"
                value={form.building_number}
                onChange={handleChange}
                required
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-slate-700">Floor</span>
              <input
                name="floor"
                value={form.floor}
                onChange={handleChange}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-slate-700">Unit</span>
              <input
                name="unit"
                value={form.unit}
                onChange={handleChange}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <label>
            <span className="text-sm font-medium text-slate-700">
              Postal code <span className="text-red-500">*</span>
            </span>
            <input
              name="postal_code"
              value={form.postal_code}
              onChange={handleChange}
              required
              inputMode="numeric"
              pattern="[0-9]{4,10}"
              placeholder="1234567890"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-slate-700">
                Receiver name <span className="text-red-500">*</span>
              </span>
              <input
                name="receiver_name"
                value={form.receiver_name}
                onChange={handleChange}
                required
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-slate-700">
                Receiver phone <span className="text-red-500">*</span>
              </span>
              <input
                name="receiver_phone"
                value={form.receiver_phone}
                onChange={handleChange}
                required
                placeholder="09123456789"
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <label className="flex items-center gap-3">
            <input
              name="is_default"
              type="checkbox"
              checked={Boolean(form.is_default)}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium text-slate-700">
              Set as default address
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || activeAddressId !== null}
          className="mt-6 h-11 w-full rounded-2xl bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save address"}
        </button>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-950">Addresses</h2>

        <p className="mt-2 text-sm text-slate-500">
          Manage saved delivery addresses.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          {pagination.count} saved addresses
        </p>
        {loadError ? (
          <div role="alert" className="mt-4 text-sm text-red-700">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
              className="mt-2 underline"
            >
              Retry addresses
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <p className="mt-8 text-sm text-slate-500">Loading addresses...</p>
        ) : null}

        {!isLoading && !loadError && !addresses.length ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-200 p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-950">
              No saved addresses
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Add your first address using the form.
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4">
          {!isLoading && !loadError
            ? addresses.map((address) => (
                <article
                  key={address.id}
                  className="rounded-3xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-950">
                          {address.title}
                        </h3>

                        {address.is_default ? (
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                            Default
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {address.province}, {address.city}, {address.street}
                        {address.alley ? `, ${address.alley}` : ""}
                        {address.building_number
                          ? `, Building ${address.building_number}`
                          : ""}
                        {address.floor ? `, Floor ${address.floor}` : ""}
                        {address.unit ? `, Unit ${address.unit}` : ""}
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Postal code: {address.postal_code}
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Receiver: {address.receiver_name} ·{" "}
                        {address.receiver_phone}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!address.is_default ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(address.id)}
                          disabled={activeAddressId !== null || isSubmitting}
                          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Set default
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleDelete(address.id)}
                        disabled={activeAddressId !== null || isSubmitting}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
            : null}
        </div>
        <nav
          aria-label="Address pages"
          className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-700"
        >
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={
              page === 1 ||
              isLoading ||
              isSubmitting ||
              activeAddressId !== null
            }
            className="rounded-xl border px-4 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.max(1, Math.ceil(pagination.count / 20))}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={
              !pagination.next ||
              isLoading ||
              Boolean(loadError) ||
              isSubmitting ||
              activeAddressId !== null
            }
            className="rounded-xl border px-4 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      </section>
    </div>
  );
}
