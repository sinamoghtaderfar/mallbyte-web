"use client";

import { OrderReturnBadge } from "@/features/returns/components/order-return-badge";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";
import type { PaginatedResponse } from "@/types/api";

import { getOrders } from "../api";
import type { OrderListItem } from "../types";

type OrderFilters = {
  search: string;
  status: string;
  payment_status: string;
  sort: string;
};

const emptyFilters: OrderFilters = {
  search: "",
  status: "",
  payment_status: "",
  sort: "newest",
};

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

function getBadgeClass(status: string) {
  if (status.includes("cancel")) {
    return "bg-red-100 text-red-700";
  }

  if (status.includes("deliver") || status.includes("paid")) {
    return "bg-green-100 text-green-700";
  }

  if (status.includes("ship") || status.includes("process")) {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

// OrderViewSet currently supports pagination, but no server-side filtering or
// ordering. Keep these controls explicitly scoped to the loaded page.
const statusOptions = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
].map((value) => ({ value, label: value.replaceAll("_", " ") }));
const paymentStatusOptions = ["unpaid", "paid", "failed", "refunded"].map(
  (value) => ({ value, label: value }),
);

function filterOrders(orders: OrderListItem[], filters: OrderFilters) {
  const searchTerm = filters.search.trim().toLowerCase();

  return orders.filter((order) => {
    const matchesSearch =
      !searchTerm || order.order_number.toLowerCase().includes(searchTerm);

    const matchesStatus = !filters.status || order.status === filters.status;

    const matchesPaymentStatus =
      !filters.payment_status ||
      order.payment_status === filters.payment_status;

    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });
}

function sortOrders(orders: OrderListItem[], sort: string) {
  return [...orders].sort((firstOrder, secondOrder) => {
    if (sort === "oldest") {
      return (
        new Date(firstOrder.created_at).getTime() -
        new Date(secondOrder.created_at).getTime()
      );
    }

    if (sort === "total_high") {
      return Number(secondOrder.total_amount) - Number(firstOrder.total_amount);
    }

    if (sort === "total_low") {
      return Number(firstOrder.total_amount) - Number(secondOrder.total_amount);
    }

    return (
      new Date(secondOrder.created_at).getTime() -
      new Date(firstOrder.created_at).getTime()
    );
  });
}

export function OrdersList() {
  const [data, setData] = useState<PaginatedResponse<OrderListItem>>({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  const orders = data.results;
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [filters, setFilters] = useState<OrderFilters>(emptyFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getOrders(page);

        if (isMounted) {
          setData(data);
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

    void loadOrders();

    return () => {
      isMounted = false;
    };
  }, [page, retry]);

  const filteredOrders = useMemo(() => {
    return sortOrders(filterOrders(orders, filters), filters.sort);
  }, [orders, filters]);

  const totalSpent = orders.reduce(
    (total, order) => total + Number(order.total_amount || 0),
    0,
  );

  const pendingOrders = orders.filter((order) =>
    order.status.includes("pending"),
  ).length;

  const hasActiveFilters =
    filters.search.trim() ||
    filters.status ||
    filters.payment_status ||
    filters.sort !== "newest";

  function handleFilterChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleClearFilters() {
    setFilters(emptyFilters);
  }

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
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="mt-4 rounded-xl border px-4 py-2 text-red-800"
        >
          Retry
        </button>
        {page > 1 && (
          <button
            type="button"
            onClick={() => setPage((value) => value - 1)}
            className="ml-3 rounded-xl border px-4 py-2 text-red-800"
          >
            Previous page
          </button>
        )}
      </div>
    );
  }

  if (!data.count) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">No orders yet</h1>

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
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Filter this page
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Find orders
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Search and sort the orders on this page. Use page navigation to browse
          your full history. Filters do not search other pages.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Search orders
            </span>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="MBA-1001"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Order status
            </span>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">All statuses</option>

              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Payment status
            </span>
            <select
              name="payment_status"
              value={filters.payment_status}
              onChange={handleFilterChange}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">All payment statuses</option>

              {paymentStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Sort this page
            </span>
            <select
              name="sort"
              value={filters.sort}
              onChange={handleFilterChange}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="total_high">Total: high to low</option>
              <option value="total_low">Total: low to high</option>
            </select>
          </label>

          <button
            type="button"
            onClick={handleClearFilters}
            className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear filters
          </button>
        </div>
      </aside>

      <section>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Orders (all pages)
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {data.count}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Pending (this page)
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {pendingOrders}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Total amount (this page)
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {formatPrice(totalSpent)}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">Orders</h1>
              <p className="mt-1 text-sm text-slate-500">
                {filteredOrders.length} of {orders.length} orders on this page ·{" "}
                {data.count} orders in your history.
              </p>
            </div>

            {hasActiveFilters ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Filters active
              </span>
            ) : null}
          </div>

          {!filteredOrders.length ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8">
              <h2 className="text-xl font-semibold text-slate-950">
                No orders on this page match your filters
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Try changing the filters, clearing them, or browsing another
                page.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
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

                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-medium",
                            getBadgeClass(order.status),
                          ].join(" ")}
                        >
                          {order.status_display}
                        </span>

                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-medium",
                            getBadgeClass(order.payment_status),
                          ].join(" ")}
                        >
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
                      <p className="mt-1 text-sm text-slate-500">
                        <span className="mb-2 block">
                          <OrderReturnBadge
                            orderId={order.id}
                            orderNumber={order.order_number}
                          />
                        </span>
                        View details →
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <nav
            aria-label="Order pages"
            className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-5"
          >
            <button
              type="button"
              disabled={!data.previous}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <p className="text-sm text-slate-600">
              Page {page} of {Math.max(1, Math.ceil(data.count / 20))}
            </p>
            <button
              type="button"
              disabled={!data.next}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        </div>
      </section>
    </div>
  );
}
