"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getOrder } from "@/features/orders/api";
import type { OrderDetail } from "@/features/orders/types";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  cancelPaymentAttempt,
  createPayment,
  markPaymentFailed,
  markPaymentSuccess,
} from "../api";
import type { PaymentDetail } from "../types";

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
  if (status.includes("success") || status.includes("paid")) {
    return "bg-green-100 text-green-700";
  }

  if (status.includes("fail") || status.includes("cancel")) {
    return "bg-red-100 text-red-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

export function PaymentSimulator() {
  const params = useParams<{ id: string }>();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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

  async function refreshOrder() {
    const updatedOrder = await getOrder(params.id);
    setOrder(updatedOrder);
  }

  async function handleCreatePayment() {
    if (!order) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsCreating(true);

    try {
      const createdPayment = await createPayment({
        order: order.id,
        provider: "mock",
      });

      setPayment(createdPayment);
      setActionMessage("Payment attempt created.");
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleMarkSuccess() {
    if (!payment) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsProcessing(true);

    try {
      const updatedPayment = await markPaymentSuccess(payment.id, {
        gateway_reference: `MOCK-${Date.now()}`,
        gateway_response: {
          status: "ok",
          source: "frontend-demo",
        },
      });

      setPayment(updatedPayment);
      await refreshOrder();
      setActionMessage("Payment completed successfully.");
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleMarkFailed() {
    if (!payment) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsProcessing(true);

    try {
      const updatedPayment = await markPaymentFailed(payment.id, {
        reason: "Mock payment failed from frontend demo.",
        gateway_response: {
          status: "failed",
          source: "frontend-demo",
        },
      });

      setPayment(updatedPayment);
      await refreshOrder();
      setActionMessage("Payment marked as failed.");
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCancelPayment() {
    if (!payment) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsProcessing(true);

    try {
      const updatedPayment = await cancelPaymentAttempt(payment.id, {
        reason: "Customer cancelled the mock payment.",
      });

      setPayment(updatedPayment);
      await refreshOrder();
      setActionMessage("Payment attempt cancelled.");
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading payment...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load payment page
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

  const isOrderPaid = order.payment_status === "paid";
  const isOrderCancelled = order.status === "cancelled";
const canCreatePayment =
  order.status === "pending_payment" &&
  order.payment_status !== "paid" &&
  (!payment || ["failed", "cancelled"].includes(payment.status));

const canResolvePayment =
  order.status === "pending_payment" &&
  order.payment_status !== "paid" &&
  payment?.status === "pending" &&
  payment.provider === "mock";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Mock payment
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Pay order {order.order_number}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            This is a demo payment screen. It creates a mock payment attempt and
            lets you simulate success, failure, or cancellation.
          </p>
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

        {isOrderPaid ? (
          <div className="mt-8 rounded-3xl border border-green-200 bg-green-50 p-5">
            <h2 className="text-lg font-semibold text-green-800">
              This order is already paid
            </h2>
            <p className="mt-2 text-sm text-green-700">
              You can go back to the order page and continue tracking it.
            </p>
          </div>
        ) : null}

        {isOrderCancelled ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-5">
            <h2 className="text-lg font-semibold text-red-800">
              This order is cancelled
            </h2>
            <p className="mt-2 text-sm text-red-700">
              Cancelled orders cannot be paid.
            </p>
          </div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Payment attempt
          </h2>

          {!payment ? (
            <p className="mt-3 text-sm text-slate-500">
              No payment attempt has been created in this session yet.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {payment.payment_number}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Provider: {payment.provider_display || payment.provider}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Created: {formatDate(payment.created_at)}
                  </p>
                </div>

                <span
                  className={[
                    "w-fit rounded-full px-4 py-2 text-sm font-medium",
                    getBadgeClass(payment.status),
                  ].join(" ")}
                >
                  {payment.status_display}
                </span>
              </div>

              {payment.gateway_reference ? (
                <p className="text-sm text-slate-500">
                  Gateway reference: {payment.gateway_reference}
                </p>
              ) : null}

              {payment.failure_reason ? (
                <p className="text-sm text-red-600">
                  Failure reason: {payment.failure_reason}
                </p>
              ) : null}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {canCreatePayment ? (
              <button
                type="button"
                onClick={() => void handleCreatePayment()}
                disabled={isCreating}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create mock payment"}
              </button>
            ) : null}

            {canResolvePayment ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleMarkSuccess()}
                  disabled={isProcessing}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-green-600 px-5 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Mark as paid"}
                </button>

                <button
                  type="button"
                  onClick={() => void handleMarkFailed()}
                  disabled={isProcessing}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 px-5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark as failed
                </button>

                <button
                  type="button"
                  onClick={() => void handleCancelPayment()}
                  disabled={isProcessing}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel payment
                </button>
              </>
            ) : null}
          </div>
        </div>

        {payment?.events.length ? (
          <div className="mt-8 rounded-3xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Payment events
            </h2>

            <div className="mt-5 space-y-4">
              {payment.events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-slate-950">
                      {event.old_status || "Created"} → {event.new_status}
                    </p>

                    <p className="text-xs text-slate-500">
                      {formatDate(event.created_at)}
                    </p>
                  </div>

                  {event.message ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {event.message}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Back to order
          </Link>

          <Link
            href="/orders"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to orders
          </Link>
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Payment summary
        </h2>

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Order status</p>
            <p className="text-sm font-medium text-slate-950">
              {order.status_display}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Payment status</p>
            <p className="text-sm font-medium text-slate-950">
              {order.payment_status_display}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-950">Total</p>
            <p className="text-lg font-semibold text-slate-950">
              {formatPrice(order.total_amount)} IRR
            </p>
          </div>
        </div>

        {payment ? (
          <div className="mt-8 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-950">
              Current attempt
            </h3>

            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>{payment.payment_number}</p>
              <p>{payment.status_display}</p>
              <p>
                {formatPrice(payment.amount)} {payment.currency}
              </p>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
