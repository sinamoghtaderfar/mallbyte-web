"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getSellerDashboard } from "../api";
import type { Seller } from "../types";

function formatMoney(value: string | number | null | undefined) {
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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

export function SellerDashboardCard() {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getSellerDashboard();

        if (isMounted) {
          setSeller(data);
        }
      } catch (dashboardError) {
        if (isMounted) {
          setError(getApiErrorMessage(dashboardError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading seller dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Seller dashboard is not available
        </h1>

        <p className="mt-2 text-sm text-red-700">{error}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/seller/status"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Check seller status
          </Link>

          <Link
            href="/seller/apply"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 px-5 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Apply as seller
          </Link>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">
          Seller profile not found
        </h1>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Seller dashboard
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {seller.store_name}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {seller.description || "No store description yet."}
            </p>
          </div>

          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium capitalize text-green-700">
            {seller.status}
          </span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Total sales
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {formatMoney(seller.total_sales)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Orders
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {seller.total_orders}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Balance
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {formatMoney(seller.balance)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Commission
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {formatMoney(seller.commission_rate)}%
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Business email
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {seller.business_email}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Verified at
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {formatDate(seller.verified_at)}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/seller/store"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Edit store settings
          </Link>

          <Link
            href="/seller/status"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            View status
          </Link>
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Next seller work
        </h2>

        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>1. Add seller product management.</p>
          <p>2. Add seller order management.</p>
          <p>3. Add real analytics charts later.</p>
        </div>
      </aside>
    </div>
  );
}
