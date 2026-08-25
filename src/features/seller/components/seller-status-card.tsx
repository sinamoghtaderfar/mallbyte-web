"use client";

import { AxiosError } from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getSellerStatus } from "../api";
import type { Seller } from "../types";

function getStatusClass(status: Seller["status"]) {
  if (status === "approved") {
    return "bg-green-100 text-green-700";
  }

  if (status === "rejected") {
    return "bg-red-100 text-red-700";
  }

  if (status === "suspended") {
    return "bg-orange-100 text-orange-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

export function SellerStatusCard() {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [hasNoApplication, setHasNoApplication] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSellerStatus() {
      setIsLoading(true);
      setError("");
      setHasNoApplication(false);

      try {
        const data = await getSellerStatus();

        if (isMounted) {
          setSeller(data);
        }
      } catch (statusError) {
        if (!isMounted) {
          return;
        }

        if (
          statusError instanceof AxiosError &&
          statusError.response?.status === 404
        ) {
          setHasNoApplication(true);
          return;
        }

        setError(getApiErrorMessage(statusError));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSellerStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading seller status...</p>
      </div>
    );
  }

  if (hasNoApplication) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">
          No seller application yet
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          You have not applied to become a seller yet. Submit an application to
          create your seller profile.
        </p>

        <Link
          href="/seller/apply"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Apply as seller
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load seller status
        </h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>
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
              Seller status
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {seller.store_name}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {seller.description || "No store description yet."}
            </p>
          </div>

          <span
            className={[
              "rounded-full px-4 py-2 text-sm font-medium capitalize",
              getStatusClass(seller.status),
            ].join(" ")}
          >
            {seller.status}
          </span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Business email
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {seller.business_email}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Business phone
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {seller.business_phone}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Applied at
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {formatDate(seller.applied_at)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Verified at
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {formatDate(seller.verified_at)}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {seller.status === "approved" ? (
            <Link
              href="/seller/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Open dashboard
            </Link>
          ) : null}

          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to products
          </Link>
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Status meaning</h2>

        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>
            <span className="font-semibold text-slate-950">Pending:</span> the
            application is waiting for admin review.
          </p>
          <p>
            <span className="font-semibold text-slate-950">Approved:</span> the
            seller account is active.
          </p>
          <p>
            <span className="font-semibold text-slate-950">Rejected:</span> the
            application was rejected by admin.
          </p>
        </div>
      </aside>
    </div>
  );
}
