"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

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

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        setIsLoading(true);
        setError("");

        const data = await getSellerOrders();

        if (isMounted) {
          setOrders(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        Loading seller orders...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">
        {error}
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
                  {order.status_display}
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
