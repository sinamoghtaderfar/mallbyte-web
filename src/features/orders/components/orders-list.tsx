"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getOrders } from "../api";
import type { OrderListItem } from "../types";

function formatPrice(value: string | number | null | undefined) {
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

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function OrdersList() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getOrders();

        if (isMounted) {
          setOrders(data.results);
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
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load orders
        </h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">
          No orders yet
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Your orders will appear here after checkout.
        </p>

        <Link
          href="/products"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-950">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track your recent MallByte orders.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block py-5 transition hover:bg-slate-50 sm:-mx-4 sm:rounded-2xl sm:px-4"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-base font-semibold text-slate-950">
                    {order.order_number}
                  </h2>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {order.status_display}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {order.payment_status_display}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  {formatDate(order.created_at)}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {order.items_count} item
                  {order.items_count === 1 ? "" : "s"}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-lg font-semibold text-slate-950">
                  {formatPrice(order.total_amount)}
                </p>
                <p className="mt-1 text-sm text-slate-500">View details →</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
