"use client";

import { StatusBadge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/page-header";
import { OrderReturnHistory } from "@/features/returns/components/order-return-history";

import {
  OrderReturnActionButton,
  OrderReturnStatusCard,
} from "@/features/returns/components/order-return-badge";
import { OrderShipmentTracking } from "@/features/shipments/components/order-shipment-tracking";
import { getApiErrorMessage } from "@/lib/api/errors";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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
  return <OrderReturnHistory><OrderDetailContent /></OrderReturnHistory>;
}

function OrderDetailContent() {
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
  const canPay =
    order?.status === "pending_payment" && order.payment_status !== "paid";
  const canRequestReturn =
    order?.payment_status === "paid" &&
    !["cancelled", "refunded"].includes(order.status);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading order...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load order
        </h1>
        <p className="mt-2 text-sm text-red-700">{loadError}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">
          Order not found
        </h1>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Breadcrumbs items={[{ href: "/orders", label: "Orders" }, { label: "Order" }]} />

            <h1 className="mt-3 font-mono text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.75rem]">
              {order.order_number}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Created at {formatDate(order.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge status={order.status} label={order.status_display} />
            <StatusBadge status={order.payment_status} label={order.payment_status_display} />
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

        <div className="mt-8 rounded-2xl border border-line bg-sunken/40 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-950">
            Order progress
          </h2>

          {order.status === "cancelled" ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              This order has been cancelled.
            </div>
          ) : (
            <ol className="mt-6 grid grid-cols-5 gap-1">
              {statusSteps.map((step, index) => {
                const completed = isStepCompleted(order.status, step.value);
                const next = statusSteps[index + 1];
                const lineDone = next ? isStepCompleted(order.status, next.value) : false;

                return (
                  <li key={step.value} className="relative flex flex-col items-center text-center" aria-current={completed && !lineDone ? "step" : undefined}>
                    {next ? <span aria-hidden="true" className={`absolute left-1/2 top-3 h-0.5 w-full ${lineDone ? "bg-ink" : "bg-slate-200"}`} /> : null}
                    <span aria-hidden="true" className={`relative z-10 flex size-6 items-center justify-center rounded-full ring-4 ring-surface ${completed ? "bg-ink text-white" : "border-2 border-slate-300 bg-surface"}`}>
                      {completed ? <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="m2.5 6.2 2.3 2.3 4.7-5" /></svg> : null}
                    </span>
                    <p className={`mt-2.5 text-xs font-medium sm:text-sm ${completed ? "text-slate-950" : "text-slate-500"}`}>{step.label}<span className="sr-only">{completed ? " (completed)" : " (pending)"}</span></p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <h2 className="mt-8 text-base font-semibold text-slate-950">Items</h2>
        <div className="mt-2 divide-y divide-line">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 gap-4">
                <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-sunken text-lg font-semibold uppercase text-slate-500">{item.product_name.slice(0, 1)}</span>
                <div className="min-w-0">
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
                <p className="mb-eyebrow">
                  Customer note
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {order.customer_note}
                </p>
              </div>
            ) : null}

            {order.admin_note ? (
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="mb-eyebrow">
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
          <div className="mt-8 rounded-2xl border border-line p-5 sm:p-6">
            <h2 className="text-base font-semibold text-slate-950">
              Status history
            </h2>

            <ol className="mt-5 space-y-0 border-l border-line pl-5">
              {order.status_history.map((history) => (
                <li
                  key={history.id}
                  className="relative pb-5 last:pb-0"
                >
                  <span aria-hidden="true" className="absolute -left-[1.6rem] top-1 size-2.5 rounded-full bg-ink ring-4 ring-surface" />
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
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <OrderShipmentTracking key={order.id} orderId={order.id} />
        <OrderReturnStatusCard
          orderId={order.id}
          orderNumber={order.order_number}
        />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/orders"
            className="mb-btn mb-btn-primary"
          >
            Back to orders
          </Link>

          <Link
            href="/products"
            className="mb-btn mb-btn-secondary"
          >
            Continue shopping
          </Link>

          {canPay ? (
            <Link
              href={`/orders/${order.id}/payment`}
              className="mb-btn mb-btn-success"
            >
              Pay now
            </Link>
          ) : null}

          <OrderReturnActionButton
            orderId={order.id}
            orderNumber={order.order_number}
            canRequestReturn={canRequestReturn}
            order={order}
          />

          {canCancel ? (
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="mb-btn mb-btn-danger"
            >
              {isCancelling ? "Cancelling..." : "Cancel order"}
            </button>
          ) : null}
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-line bg-surface p-6 shadow-sm lg:sticky lg:top-36">
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
