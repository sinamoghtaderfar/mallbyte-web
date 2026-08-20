"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
} from "../api";
import type { Address, AddressPayload } from "../types";

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
  const [form, setForm] = useState<AddressPayload>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAddressId, setActiveAddressId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadAddresses() {
    setIsLoading(true);
    setError("");

    try {
      const data = await getAddresses();
      setAddresses(data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
  }, []);

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
      await loadAddresses();
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
      await loadAddresses();
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
      await loadAddresses();
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
        <h1 className="text-2xl font-semibold text-slate-950">
          Add address
        </h1>

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
            <span className="text-sm font-medium text-slate-700">Title</span>
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
                Province
              </span>
              <input
                name="province"
                value={form.province}
                onChange={handleChange}
                required
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-slate-700">City</span>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <label>
            <span className="text-sm font-medium text-slate-700">Street</span>
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
                Building
              </span>
              <input
                name="building_number"
                value={form.building_number}
                onChange={handleChange}
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
              Postal code
            </span>
            <input
              name="postal_code"
              value={form.postal_code}
              onChange={handleChange}
              required
              placeholder="1234567890"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-slate-700">
                Receiver name
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
                Receiver phone
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
          disabled={isSubmitting}
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

        {isLoading ? (
          <p className="mt-8 text-sm text-slate-500">Loading addresses...</p>
        ) : null}

        {!isLoading && !addresses.length ? (
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
          {addresses.map((address) => (
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
                    Receiver: {address.receiver_name} · {address.receiver_phone}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!address.is_default ? (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(address.id)}
                      disabled={activeAddressId === address.id}
                      className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Set default
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleDelete(address.id)}
                    disabled={activeAddressId === address.id}
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
