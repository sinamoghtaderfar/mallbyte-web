"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";
import { getSessionGeneration, isCurrentSession } from "@/lib/auth/session-storage";
import type { PaginatedResponse } from "@/types/api";

import { getSellerOrders } from "../api";
import type { SellerOrderListItem } from "../types";

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SellerOrdersList() {
  const [orders, setOrders] = useState<SellerOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [pagination, setPagination] = useState<PaginatedResponse<SellerOrderListItem> | null>(null);
  const requestVersion = useRef(0);

  function changePage(nextPage: number) {
    requestVersion.current += 1;
    setIsLoading(true);
    setError("");
    setPage(nextPage);
  }

  function retryPage() {
    requestVersion.current += 1;
    setIsLoading(true);
    setError("");
    setRetry((current) => current + 1);
  }

  useEffect(() => {
    let isMounted = true;
    const version = ++requestVersion.current;
    const session = getSessionGeneration();
    const controller = new AbortController();
    const current = () => isMounted && version === requestVersion.current && isCurrentSession(session);

    async function loadOrders() {
      try {
        setIsLoading(true);
        setError("");

        const data = await getSellerOrders(page, controller.signal);

        if (current()) {
          setOrders(data.results);
          setPagination(data);
        }
      } catch (loadError) {
        if (current()) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (current()) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [page, retry]);

  const pager = (
    <nav aria-label="Seller order pages" className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-700">
      <span>
        {pagination ? `${pagination.count} seller orders · Page ${page} of ${Math.max(1, Math.ceil(pagination.count / 20))}` : `Page ${page}`}
      </span>
      <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)} className="rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-40">Previous seller orders</button>
      <button type="button" disabled={isLoading || Boolean(error) || !pagination?.next} onClick={() => changePage(page + 1)} className="rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-40">Next seller orders</button>
    </nav>
  );

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        Loading seller orders...
        {pager}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">
        {error}
        <button type="button" onClick={retryPage} className="ml-3 font-semibold underline">Retry seller orders</button>
        {pager}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Seller dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Seller Orders
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Manage orders that include your products and move paid orders through
          the fulfillment flow.
        </p>
      </div>

      {pager}

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          No seller orders yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-6 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span className="col-span-2">Order</span>
            <span>Status</span>
            <span>Payment</span>
            <span>Seller total</span>
            <span className="text-right">Action</span>
          </div>

          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 text-sm text-slate-700 md:grid-cols-6 md:items-center md:gap-4"
              >
                <div className="md:col-span-2">
                  <p className="font-semibold text-slate-950">
                    {order.order_number}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(order.created_at)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {order.seller_items_count} item(s)
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {order.seller_status_display}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {order.payment_status_display}
                </span>

                <span className="font-semibold text-slate-950">
                  {formatMoney(order.seller_total_amount)}
                </span>

                <div className="md:text-right">
                  <Link
                    href={`/seller/orders/${order.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    View details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
