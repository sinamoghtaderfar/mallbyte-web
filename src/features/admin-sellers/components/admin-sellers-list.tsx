"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  type AdminSeller,
  type AdminSellerStatus,
  getAdminSellers,
} from "@/features/admin-sellers/api";
import { getApiErrorMessage } from "@/lib/api/errors";

const statusLabels: Record<AdminSellerStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function getSellerStoreLabel(seller: AdminSeller) {
  return (
    seller.store_name ||
    seller.business_name ||
    seller.business_email ||
    getSellerOwnerLabel(seller)
  );
}

function getSellerOwnerLabel(seller: AdminSeller) {
  if (seller.user_full_name || seller.user_email) {
    return seller.user_full_name || seller.user_email;
  }

  if (typeof seller.user === "object") {
    return seller.user.full_name || seller.user.email;
  }

  return String(seller.user);
}

export function AdminSellersList() {
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | AdminSellerStatus>(
    "all",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSellers() {
      try {
        setIsLoading(true);
        setError("");
        const data = await getAdminSellers();

        if (isMounted) {
          setSellers(data);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getApiErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSellers();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSellers = useMemo(() => {
    if (statusFilter === "all") {
      return sellers;
    }

    return sellers.filter((seller) => seller.status === statusFilter);
  }, [sellers, statusFilter]);

  const pendingCount = sellers.filter(
    (seller) => seller.status === "pending",
  ).length;

  const approvedCount = sellers.filter(
    (seller) => seller.status === "approved",
  ).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Seller management
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Review seller applications, approve verified stores, and keep track
            of rejected or suspended sellers.
          </p>
        </div>

        <Link
          href="/admin/returns"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Return management
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total sellers</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {sellers.length}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending review</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Approved sellers</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {approvedCount}
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-950">
            Seller applications
          </h2>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | AdminSellerStatus)
            }
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-500">Loading sellers...</p>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : filteredSellers.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            No seller applications found.
          </p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Store</span>
              <span>Owner</span>
              <span>Status</span>
              <span>Sales</span>
              <span>Created</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {filteredSellers.map((seller) => (
                <div
                  key={seller.id}
                  className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] md:items-center"
                >
                  <div>
                    <Link
                      href={`/admin/sellers/${seller.id}`}
                      className="font-semibold text-slate-950 hover:underline"
                    >
                      {getSellerStoreLabel(seller)}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {seller.business_email}
                    </p>
                  </div>

                  <p className="text-sm text-slate-600">
                    {getSellerOwnerLabel(seller)}
                  </p>

                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {statusLabels[seller.status] ?? seller.status}
                  </span>

                  <p className="text-sm font-medium text-slate-950">
                    {formatMoney(seller.total_sales)}
                  </p>

                  <p className="text-sm text-slate-600">
                    {formatDate(seller.created_at)}
                  </p>

                  <Link
                    href={`/admin/sellers/${seller.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
