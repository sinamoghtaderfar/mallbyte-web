"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

import { useAuthStore } from "@/features/auth/auth-store";
import { getApiErrorMessage } from "@/lib/api/errors";

import { applyAsSeller } from "../api";
import type { SellerApplicationPayload } from "../types";

const initialForm: SellerApplicationPayload = {
  store_name: "",
  description: "",
  business_phone: "",
  business_email: "",
  website: "",
  bank_info: {
    account_holder: "",
    iban: "",
  },
  documents: [],
};

export function SellerApplicationForm() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [form, setForm] = useState<SellerApplicationPayload>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const businessEmailValue = form.business_email || user?.email || "";

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleBankInfoChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

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
    setIsSubmitting(true);

    try {
      await applyAsSeller({
        ...form,
        business_email: businessEmailValue,
        website: form.website.trim(),
        documents: [],
      });

      router.push("/seller/status");
    } catch (applyError) {
      setError(getApiErrorMessage(applyError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Seller application
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Apply to sell on MallByte
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Create a seller profile. After approval, seller dashboard and store
            settings will become available.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Store name
            </span>
            <input
              name="store_name"
              value={form.store_name}
              onChange={handleChange}
              required
              maxLength={100}
              placeholder="MallByte Demo Store"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

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
              placeholder="Tell us what this store sells."
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
              placeholder="+4917612345678"
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
              value={businessEmailValue}
              onChange={handleChange}
              required
              placeholder="store@example.com"
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
              placeholder="Sina Moghtader Far"
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
              placeholder="DE..."
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
            {isSubmitting ? "Submitting..." : "Submit application"}
          </button>

          <Link
            href="/seller/status"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Check status
          </Link>
        </div>
      </form>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          What happens next?
        </h2>

        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>1. Your seller application is created with pending status.</p>
          <p>
            2. An admin can approve or reject it from the backend/admin side.
          </p>
          <p>3. After approval, seller dashboard and store settings open.</p>
        </div>
      </aside>
    </div>
  );
}
