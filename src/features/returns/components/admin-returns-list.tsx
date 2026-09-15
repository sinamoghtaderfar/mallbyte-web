"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  type AdminReturnListItem,
  type AdminReturnStatus,
  getAdminReturns,
} from "@/features/returns/admin-api";
import { getApiErrorMessage } from "@/lib/api/errors";

const openStatuses: AdminReturnStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "waiting_for_item",
  "item_received",
  "inspecting",
  "refund_pending",
];

const statusLabels: Record<AdminReturnStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  waiting_for_item: "Waiting for item",
  item_received: "Item received",
  inspecting: "Inspecting",
  refund_pending: "Refund pending",
  refunded: "Refunded",
  replaced: "Replaced",
  cancelled: "Cancelled",
  closed: "Closed",
};

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function AdminReturnsList() {
  const [returns, setReturns] = useState<AdminReturnListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | AdminReturnStatus>(
    "all",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReturns() {
      try {
        setIsLoading(true);
        setError("");
        const data = await getAdminReturns();

        if (isMounted) {
          setReturns(data);
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

    void loadReturns();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredReturns = useMemo(() => {
    if (statusFilter === "all") {
      return returns;
    }

    return returns.filter(
      (returnRequest) => returnRequest.status === statusFilter,
    );
  }, [returns, statusFilter]);

  const openCount = returns.filter((returnRequest) =>
    openStatuses.includes(returnRequest.status),
  ).length;

  const refundedCount = returns.filter(
    (returnRequest) => returnRequest.status === "refunded",
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              Return management
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review customer return requests, approve or reject them, confirm
              received items, and mark refunds as completed.
            </p>
          </div>

          <Link
            href="/returns"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Customer returns
          </Link>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total requests</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {returns.length}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Open requests</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {openCount}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Refunded</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {refundedCount}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-950">
              Return requests
            </h2>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | AdminReturnStatus)
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
            <p className="mt-6 text-sm text-slate-500">Loading returns...</p>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : filteredReturns.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              No return requests found.
            </p>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
                <span>Request</span>
                <span>Customer</span>
                <span>Status</span>
                <span>Requested</span>
                <span>Created</span>
                <span />
              </div>

              <div className="divide-y divide-slate-100">
                {filteredReturns.map((returnRequest) => (
                  <div
                    key={returnRequest.id}
                    className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] md:items-center"
                  >
                    <div>
                      <Link
                        href={`/admin/returns/${returnRequest.id}`}
                        className="font-semibold text-slate-950 hover:underline"
                      >
                        {returnRequest.request_number}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        Order {returnRequest.order_number}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600">
                      {returnRequest.customer}
                    </p>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {statusLabels[returnRequest.status]}
                    </span>

                    <p className="text-sm font-medium text-slate-950">
                      {formatMoney(returnRequest.total_requested_amount)}
                    </p>

                    <p className="text-sm text-slate-600">
                      {formatDate(returnRequest.created_at)}
                    </p>

                    <Link
                      href={`/admin/returns/${returnRequest.id}`}
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
      </div>
    </main>
  );
}
