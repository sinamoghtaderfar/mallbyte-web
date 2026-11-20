"use client";

import { OrderReturnHistory } from "@/features/returns/components/order-return-history";

import { OrderReturnBadge } from "@/features/returns/components/order-return-badge";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { ChevronRight, Package, Search } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
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
  return <OrderReturnHistory><OrdersListContent /></OrderReturnHistory>;
}

function OrdersListContent() {
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
      <div role="status" className="space-y-4">
        <span className="sr-only">Loading orders...</span>
        <Skeleton className="h-10 w-48" />
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-8 shadow-sm">
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
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700" aria-hidden="true"><Package size={24} strokeWidth={1.6} /></span>
        <h1 className="mb-display mt-6 text-[2.25rem] text-ink">No orders yet</h1>

        <p className="mt-2 text-sm text-muted">
          Your orders will appear here after checkout.
        </p>

        <Link
          href="/products"
          className={buttonStyles({ className: "mt-6 rounded-full" })}
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-eyebrow">Your account</p>
          <h1 className="mb-display mt-2 text-[2.5rem] text-ink">Orders</h1>
          <p className="mt-1 text-sm text-muted">
            {filteredOrders.length} of {orders.length} orders on this page ·{" "}
            {data.count} orders in your history.
          </p>
        </div>
        {hasActiveFilters ? (
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">
            Filters active
          </span>
        ) : null}
      </div>

      <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm sm:grid-cols-3">
        <div className="p-4 sm:p-5">
          <dt className="text-xs text-muted sm:text-sm">Orders (all pages)</dt>
          <dd data-numeric className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{data.count}</dd>
        </div>
        <div className="border-l border-line p-4 sm:p-5">
          <dt className="text-xs text-muted sm:text-sm">Pending (this page)</dt>
          <dd data-numeric className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{pendingOrders}</dd>
        </div>
        <div className="col-span-2 border-t border-line p-4 sm:col-span-1 sm:border-l sm:border-t-0 sm:p-5">
          <dt className="text-xs text-muted sm:text-sm">Total amount (this page)</dt>
          <dd data-numeric className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 [overflow-wrap:anywhere] sm:text-2xl">{formatPrice(totalSpent)}</dd>
        </div>
      </dl>

      <section aria-label="Filter this page" className="mt-6 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto] xl:items-end">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">
              Search orders
            </span>
            <span className="relative mt-1 block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="MBA-1001"
                className="w-full mb-control pl-9"
              />
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">
              Order status
            </span>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="mt-1 w-full mb-control mb-select"
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
            <span className="text-xs font-medium text-slate-700">
              Payment status
            </span>
            <select
              name="payment_status"
              value={filters.payment_status}
              onChange={handleFilterChange}
              className="mt-1 w-full mb-control mb-select"
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
            <span className="text-xs font-medium text-slate-700">
              Sort this page
            </span>
            <select
              name="sort"
              value={filters.sort}
              onChange={handleFilterChange}
              className="mt-1 w-full mb-control mb-select"
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
            className="mb-btn mb-btn-secondary"
          >
            Clear filters
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">Search and sort the orders on this page. Use page navigation to browse your full history. Filters do not search other pages.</p>
      </section>

      <section aria-label="Order list" className="mt-6">
        {!filteredOrders.length ? (
          <div className="rounded-2xl border border-dashed border-line-strong p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-950">
              No orders on this page match your filters
            </h2>
            <p className="mt-2 text-sm text-muted">
              Try changing the filters, clearing them, or browsing another
              page.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="group grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-line-strong hover:shadow-md sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-mono text-[0.9375rem] font-semibold text-slate-950">
                        {order.order_number}
                      </h2>
                      <StatusBadge status={order.status} label={order.status_display} />
                      <StatusBadge status={order.payment_status} label={order.payment_status_display} />
                    </div>

                    <p className="mt-2 text-sm text-muted">
                      {formatDate(order.created_at)}
                      <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
                      {order.items_count} item
                      {order.items_count === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="block"><OrderReturnBadge orderId={order.id} orderNumber={order.order_number} /></span>
                    <p data-numeric className="text-lg font-semibold tracking-tight text-slate-950">
                      {formatPrice(order.total_amount)}
                    </p>
                    <span className="hidden text-sm text-muted sm:inline-flex sm:items-center sm:gap-1 sm:group-hover:text-ink">View details <ChevronRight size={15} aria-hidden="true" /></span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <nav
          aria-label="Order pages"
          className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5"
        >
          <button
            type="button"
            disabled={!data.previous}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="mb-btn mb-btn-secondary mb-btn-sm"
          >
            Previous
          </button>
          <p className="text-sm text-muted">
            Page {page} of {Math.max(1, Math.ceil(data.count / 20))}
          </p>
          <button
            type="button"
            disabled={!data.next}
            onClick={() => setPage((value) => value + 1)}
            className="mb-btn mb-btn-secondary mb-btn-sm"
          >
            Next
          </button>
        </nav>
      </section>
    </div>
  );
}
