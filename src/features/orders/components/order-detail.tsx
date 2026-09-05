"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { cancelOrder, getOrder } from "../api";
import type { OrderDetail as OrderDetailType } from "../types";

const statusSteps = [
  { value: "pending_payment", label: "Pending payment" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

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

function isStepCompleted(orderStatus: string, stepValue: string) {
  if (orderStatus === "cancelled") {
    return false;
  }

  const currentIndex = statusSteps.findIndex(
    (step) => step.value === orderStatus,
  );
  const stepIndex = statusSteps.findIndex((step) => step.value === stepValue);

  if (currentIndex === -1 || stepIndex === -1) {
    return false;
  }

  return stepIndex <= currentIndex;
}

export function OrderDetail() {
  const params = useParams<{ id: string }>();

  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      setIsLoading(true);
      setLoadError("");
      setActionError("");
      setActionMessage("");

      try {
        const data = await getOrder(params.id);

        if (isMounted) {
          setOrder(data);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  async function handleCancelOrder() {
    if (!order) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this order?",
    );

    if (!confirmed) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsCancelling(true);

    try {
      const updatedOrder = await cancelOrder(order.id);
      setOrder(updatedOrder);
      setActionMessage("Order cancelled successfully.");
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setIsCancelling(false);
    }
  }

  const canCancel = order?.status === "pending_payment";

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading order...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load order
        </h1>
        <p className="mt-2 text-sm text-red-700">{loadError}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">
          Order not found
        </h1>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Order
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {order.order_number}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Created at {formatDate(order.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={[
                "rounded-full px-4 py-2 text-sm font-medium",
                getBadgeClass(order.status),
              ].join(" ")}
            >
              {order.status_display}
            </span>

            <span
              className={[
                "rounded-full px-4 py-2 text-sm font-medium",
                getBadgeClass(order.payment_status),
              ].join(" ")}
            >
              {order.payment_status_display}
            </span>
          </div>
        </div>

        {actionError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {actionMessage}
          </div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Order progress
          </h2>

          {order.status === "cancelled" ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              This order has been cancelled.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-5">
              {statusSteps.map((step) => {
                const completed = isStepCompleted(order.status, step.value);

                return (
                  <div
                    key={step.value}
                    className={[
                      "rounded-2xl border p-4 text-sm",
                      completed
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-slate-200 bg-slate-50 text-slate-500",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "mb-3 h-3 w-3 rounded-full",
                        completed ? "bg-green-500" : "bg-slate-300",
                      ].join(" ")}
                    />
                    <p className="font-medium">{step.label}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 divide-y divide-slate-100">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/products/${item.product_id || item.product}`}
                  className="text-base font-semibold text-slate-950 underline-offset-4 hover:underline"
                >
                  {item.product_name}
                </Link>

                <p className="mt-1 text-sm text-slate-500">
                  SKU: {item.product_sku}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Quantity: {item.quantity}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Warehouse: {item.warehouse_name || "Not assigned"}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-sm text-slate-500">
                  Unit: {formatPrice(item.unit_price)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  Total: {formatPrice(item.total_price)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {order.customer_note || order.admin_note ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {order.customer_note ? (
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Customer note
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {order.customer_note}
                </p>
              </div>
            ) : null}

            {order.admin_note ? (
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Admin note
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {order.admin_note}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {order.status_history.length ? (
          <div className="mt-8 rounded-3xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Status history
            </h2>

            <div className="mt-5 space-y-4">
              {order.status_history.map((history) => (
                <div
                  key={history.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-slate-950">
                      {history.old_status || "Created"} → {history.new_status}
                    </p>

                    <p className="text-xs text-slate-500">
                      {formatDate(history.created_at)}
                    </p>
                  </div>

                  {history.note ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {history.note}
                    </p>
                  ) : null}

                  {history.changed_by_name ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Changed by {history.changed_by_name}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/orders"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Back to orders
          </Link>

          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Continue shopping
          </Link>

          {canCancel ? (
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCancelling ? "Cancelling..." : "Cancel order"}
            </button>
          ) : null}
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Summary</h2>

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Subtotal</p>
            <p className="text-sm font-medium text-slate-950">
              {formatPrice(order.subtotal)}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Discount</p>
            <p className="text-sm font-medium text-slate-950">
              {formatPrice(order.discount_amount)}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Shipping</p>
            <p className="text-sm font-medium text-slate-950">
              {formatPrice(order.shipping_cost)}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Tax</p>
            <p className="text-sm font-medium text-slate-950">
              {formatPrice(order.tax_amount)}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-950">Total</p>
            <p className="text-lg font-semibold text-slate-950">
              {formatPrice(order.total_amount)}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-950">
            Receiver information
          </h3>

          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>{order.receiver_name}</p>
            <p>{order.receiver_phone}</p>
            <p>
              {order.province}, {order.city}
            </p>
            <p>{order.address}</p>
            <p>{order.postal_code}</p>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-950">
            Important dates
          </h3>

          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Paid: {formatDate(order.paid_at)}</p>
            <p>Cancelled: {formatDate(order.cancelled_at)}</p>
            <p>Delivered: {formatDate(order.delivered_at)}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
