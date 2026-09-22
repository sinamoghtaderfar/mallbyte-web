
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getOrders } from "@/features/orders/api";
import type { OrderListItem } from "@/features/orders/types";
import { getApiErrorMessage } from "@/lib/api/errors";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const result = await getOrders();

        if (!cancelled) {
          setOrders(result.results);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(getApiErrorMessage(caughtError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;

    return orders.filter(
      (order) => order.status === filter,
    );
  }, [orders, filter]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Admin
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Order management
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Review orders and manage their fulfillment
          through Shipping and Returns.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/shipments"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Manage shipments
        </Link>

        <Link
          href="/admin/returns"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Manage returns
        </Link>
      </div>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
        <label className="block max-w-xs text-sm font-medium text-slate-700">
          Order status
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="mt-2 block h-11 w-full rounded-xl border border-slate-200 px-3"
          >
            <option value="all">All orders</option>
            <option value="pending_payment">Pending payment</option>
            <option value="paid">Paid</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-500">
            Loading orders...
          </p>
        ) : error ? (
          <p role="alert" className="mt-6 text-sm text-red-700">
            {error}
          </p>
        ) : filteredOrders.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            No orders found.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3">Order</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Payment</th>
                  <th className="py-3">Total</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-100"
                  >
                    <td className="py-4 font-medium text-slate-950">
                      {order.order_number}
                    </td>

                    <td className="py-4">
                      {order.status_display}
                    </td>

                    <td className="py-4">
                      {order.payment_status_display}
                    </td>

                    <td className="py-4">
                      {Number(order.total_amount).toLocaleString()} IRR
                    </td>

                    <td className="py-4 text-slate-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-4">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        View order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}