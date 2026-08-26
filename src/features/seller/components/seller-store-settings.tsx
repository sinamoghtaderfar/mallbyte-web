"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getSellerStore, updateSellerStore } from "../api";
import type { SellerStorePayload } from "../types";

const initialForm: SellerStorePayload = {
  description: "",
  business_phone: "",
  business_email: "",
  website: "",
  bank_info: {
    account_holder: "",
    iban: "",
  },
};

export function SellerStoreSettings() {
  const [form, setForm] = useState<SellerStorePayload>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStore() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getSellerStore();
        const bankInfo = data.bank_info ?? {};

        if (isMounted) {
          setForm({
            description: data.description ?? "",
            business_phone: data.business_phone ?? "",
            business_email: data.business_email ?? "",
            website: data.website ?? "",
            bank_info: {
              account_holder: bankInfo.account_holder ?? "",
              iban: bankInfo.iban ?? "",
            },
          });
        }
      } catch (storeError) {
        if (isMounted) {
          setError(getApiErrorMessage(storeError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadStore();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setSuccessMessage("");

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleBankInfoChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setSuccessMessage("");

    setForm((current) => ({
      ...current,
      bank_info: {
        ...current.bank_info,
        [name]: value,
      },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const updatedStore = await updateSellerStore(form);
      const bankInfo = updatedStore.bank_info ?? {};

      setForm({
        description: updatedStore.description ?? "",
        business_phone: updatedStore.business_phone ?? "",
        business_email: updatedStore.business_email ?? "",
        website: updatedStore.website ?? "",
        bank_info: {
          account_holder:
            bankInfo.account_holder ?? form.bank_info.account_holder,
          iban: bankInfo.iban ?? form.bank_info.iban,
        },
      });

      setSuccessMessage("Store settings updated successfully.");
    } catch (storeError) {
      setError(getApiErrorMessage(storeError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading store settings...</p>
      </div>
    );
  }

  if (error && !form.business_email) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Store settings are not available
        </h1>

        <p className="mt-2 text-sm text-red-700">{error}</p>

        <Link
          href="/seller/status"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Check seller status
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
            Store settings
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Edit seller store
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Update public store information and payout details.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Description
            </span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Business phone
            </span>
            <input
              name="business_phone"
              value={form.business_phone}
              onChange={handleChange}
              required
              maxLength={15}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Business email
            </span>
            <input
              name="business_email"
              type="email"
              value={form.business_email}
              onChange={handleChange}
              required
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Website</span>
            <input
              name="website"
              type="url"
              value={form.website}
              onChange={handleChange}
              placeholder="https://example.com"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Account holder
            </span>
            <input
              name="account_holder"
              value={form.bank_info.account_holder}
              onChange={handleBankInfoChange}
              required
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">IBAN</span>
            <input
              name="iban"
              value={form.bank_info.iban}
              onChange={handleBankInfoChange}
              required
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 rounded-2xl bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save store settings"}
          </button>

          <Link
            href="/seller/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </div>
      </form>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Seller note</h2>

        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>Only approved sellers can access this page.</p>
          <p>Logo and banner upload can be added in a later step.</p>
          <p>For now, this page edits core store information.</p>
        </div>
      </aside>
    </div>
  );
}
