"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getSellerOrder, updateSellerOrderStatus } from "../api";
import type {
  SellerOrderDetail as SellerOrderDetailType,
  SellerOrderStatusPayload,
} from "../types";

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getNextStatus(
  status: SellerOrderDetailType["seller_status"],
): SellerOrderStatusPayload["status"] | null {
  if (status === "paid") return "processing";
  if (status === "processing") return "shipped";
  if (status === "shipped") return "delivered";

  return null;
}

function getStatusButtonLabel(status: SellerOrderStatusPayload["status"]) {
  if (status === "processing") return "Mark as processing";
  if (status === "shipped") return "Mark as shipped";
  return "Mark as delivered";
}

export function SellerOrderDetail() {
  const params = useParams<{ id: string }>();

  const [order, setOrder] = useState<SellerOrderDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const nextStatus = useMemo(() => {
    if (!order) return null;

    if (order.payment_status !== "paid") return null;
    if (order.status === "cancelled" || order.status === "refunded") {
      return null;
    }

    return getNextStatus(order.seller_status);
  }, [order]);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      try {
        setIsLoading(true);
        setError("");

        const data = await getSellerOrder(params.id);

        if (isMounted) {
          setOrder(data);
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

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  async function handleUpdateStatus(
    status: SellerOrderStatusPayload["status"],
  ) {
    try {
      setIsUpdating(true);
      setActionError("");
      setActionMessage("");

      const updatedOrder = await updateSellerOrderStatus(params.id, {
        status,
        note: `Seller changed their fulfillment status to ${status}.`,
      });

      setOrder(updatedOrder);
      setActionMessage("Your fulfillment status was updated.");
    } catch (updateError) {
      setActionError(getApiErrorMessage(updateError));
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        Loading seller order...
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

  if (!order) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        Order not found.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/seller/orders"
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            ← Back to seller orders
          </Link>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Seller order
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {order.order_number}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Your fulfillment: {order.seller_status_display}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Overall order: {order.status_display}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Payment: {order.payment_status_display}
            </span>
          </div>
        </div>

        {nextStatus ? (
          <button
            type="button"
            onClick={() => handleUpdateStatus(nextStatus)}
            disabled={isUpdating}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? "Updating..." : getStatusButtonLabel(nextStatus)}
          </button>
        ) : null}
      </div>

      {actionMessage ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {actionMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Your items</h2>

            <div className="mt-4 divide-y divide-slate-100">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-950">
                      {item.product_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      SKU: {item.product_sku}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Quantity: {item.quantity}
                    </p>
                  </div>

                  <div className="text-sm font-semibold text-slate-950">
                    {formatMoney(item.total_price)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-600">Seller total</span>
              <span className="font-bold text-slate-950">
                {formatMoney(order.seller_total_amount)}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Overall order history
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              This is the overall order history, not the individual seller
              fulfillment history.
            </p>

            {order.status_history.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">
                No status history yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {order.status_history.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm"
                  >
                    <p className="font-medium text-slate-950">
                      {event.old_status || "created"} → {event.new_status}
                    </p>
                    {event.note ? (
                      <p className="mt-1 text-slate-600">{event.note}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(event.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Fulfillment address
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Receiver</dt>
                <dd className="font-medium text-slate-950">
                  {order.receiver_name}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-950">
                  {order.receiver_phone}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Address</dt>
                <dd className="font-medium text-slate-950">
                  {order.address}, {order.city}, {order.province},{" "}
                  {order.postal_code}
                </dd>
              </div>
              {order.customer_note ? (
                <div>
                  <dt className="text-slate-500">Customer note</dt>
                  <dd className="font-medium text-slate-950">
                    {order.customer_note}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Important dates
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="font-medium text-slate-950">
                  {formatDate(order.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Paid</dt>
                <dd className="font-medium text-slate-950">
                  {formatDate(order.paid_at)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Delivered</dt>
                <dd className="font-medium text-slate-950">
                  {formatDate(order.delivered_at)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
