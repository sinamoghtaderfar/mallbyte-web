"use client";

import Link from "next/link";

import { useAuthStore } from "../auth-store";

export function ProfileCard() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Profile
      </p>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {user.full_name || "MallByte User"}
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Email
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {user.email}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Phone
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {user.phone || "Not added"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Email verified
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {user.email_verified ? "Yes" : "No"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Account type
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {user.is_seller ? "Seller" : "Customer"}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back home
        </Link>

        {user.is_seller ? (
          <Link
            href="/seller"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Open seller dashboard
          </Link>
        ) : null}
      </div>
    </div>
  );
}
