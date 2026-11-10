"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  const [query, setQuery] = useState<{
    page: number;
    status: "all" | AdminSellerStatus;
  }>({ page: 1, status: "all" });
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
  });
  const [retry, setRetry] = useState(0);
  const requestVersion = useRef(0);
  const statusFilter = query.status;

  function changeQuery(next: typeof query) {
    requestVersion.current += 1;
    setIsLoading(true);
    setError("");
    setQuery(next);
  }
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const request = ++requestVersion.current;
    const controller = new AbortController();
    const isCurrent = () => request === requestVersion.current;

    async function loadSellers() {
      try {
        setIsLoading(true);
        setError("");
        const data = await getAdminSellers(
          query.page,
          query.status === "all" ? undefined : query.status,
          controller.signal,
        );

        if (isCurrent()) {
          setSellers(data.results);
          setPagination(data);
        }
      } catch (caughtError) {
        if (isCurrent()) {
          setError(getApiErrorMessage(caughtError));
        }
      } finally {
        if (isCurrent()) {
          setIsLoading(false);
        }
      }
    }

    void loadSellers();

    return () => {
      requestVersion.current += 1;
      controller.abort();
    };
  }, [query, retry]);

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
          <p className="text-sm text-slate-500">Matching sellers (all pages)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {pagination.count}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending review (this page)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Approved sellers (this page)</p>
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
            aria-label="Seller status"
            value={statusFilter}
            onChange={(event) =>
              changeQuery({
                page: 1,
                status: event.target.value as "all" | AdminSellerStatus,
              })
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
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="mt-3 underline"
            >
              Retry sellers
            </button>
          </div>
        ) : sellers.length === 0 ? (
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
              {sellers.map((seller) => (
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
        <nav
          aria-label="Seller pages"
          className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-700"
        >
          <button
            type="button"
            disabled={query.page === 1 || isLoading}
            onClick={() => changeQuery({ ...query, page: query.page - 1 })}
            className="rounded-xl border px-4 py-2 disabled:opacity-50"
          >
            Previous sellers
          </button>
          <span>
            Page {query.page} of {Math.max(1, Math.ceil(pagination.count / 20))}
          </span>
          <button
            type="button"
            disabled={!pagination.next || isLoading || Boolean(error)}
            onClick={() => changeQuery({ ...query, page: query.page + 1 })}
            className="rounded-xl border px-4 py-2 disabled:opacity-50"
          >
            Next sellers
          </button>
        </nav>
      </section>
    </main>
  );
}
