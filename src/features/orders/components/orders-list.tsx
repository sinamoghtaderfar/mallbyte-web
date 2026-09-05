"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

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

function getUniqueOptions(
  orders: OrderListItem[],
  valueKey: "status" | "payment_status",
  labelKey: "status_display" | "payment_status_display",
) {
  const options = new Map<string, string>();

  orders.forEach((order) => {
    options.set(order[valueKey], order[labelKey]);
  });

  return Array.from(options.entries()).map(([value, label]) => ({
    value,
    label,
  }));
}

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
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [filters, setFilters] = useState<OrderFilters>(emptyFilters);
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

    void loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    return sortOrders(filterOrders(orders, filters), filters.sort);
  }, [orders, filters]);

  const statusOptions = useMemo(
    () => getUniqueOptions(orders, "status", "status_display"),
    [orders],
  );

  const paymentStatusOptions = useMemo(
    () => getUniqueOptions(orders, "payment_status", "payment_status_display"),
    [orders],
  );

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
      </div>
    );
  }

  if (!orders.length) {
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
          Order filters
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Find orders
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Search your order history by order number, status, payment status, and
          total amount.
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
            <span className="text-sm font-medium text-slate-700">Sort by</span>
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
              Orders
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {orders.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Pending
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {pendingOrders}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Total spent
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
                {filteredOrders.length} of {orders.length} orders shown.
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
                No orders match your filters
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Try changing the search term or clearing the filters.
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
                        View details →
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
