"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { cancelReturnRequest, getReturnRequest } from "../api";
import type { ReturnDetail as ReturnDetailType } from "../types";

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

function formatStatus(value: string) {
  return value
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function ReturnDetail() {
  const params = useParams<{ id: string }>();

  const [returnRequest, setReturnRequest] = useState<ReturnDetailType | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const canCancel = useMemo(() => {
    if (!returnRequest) return false;

    return ["submitted", "under_review"].includes(returnRequest.status);
  }, [returnRequest]);

  useEffect(() => {
    let isMounted = true;

    async function loadReturnRequest() {
      try {
        setIsLoading(true);
        setError("");

        const data = await getReturnRequest(params.id);

        if (isMounted) {
          setReturnRequest(data);
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

    loadReturnRequest();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  async function handleCancel() {
    try {
      setIsCancelling(true);
      setActionError("");
      setActionMessage("");

      const updatedReturnRequest = await cancelReturnRequest(params.id, {
        note: "Customer cancelled the return request.",
      });

      setReturnRequest(updatedReturnRequest);
      setActionMessage("Return request cancelled.");
    } catch (cancelError) {
      setActionError(getApiErrorMessage(cancelError));
    } finally {
      setIsCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        Loading return request...
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

  if (!returnRequest) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        Return request not found.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/returns"
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            ← Back to returns
          </Link>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Return request
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {returnRequest.request_number}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {formatStatus(returnRequest.status)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Order: {returnRequest.order_number}
            </span>
          </div>
        </div>

        {canCancel ? (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isCancelling}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 bg-white px-5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCancelling ? "Cancelling..." : "Cancel return"}
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
            <h2 className="text-lg font-semibold text-slate-950">
              Return items
            </h2>

            <div className="mt-4 divide-y divide-slate-100">
              {returnRequest.items.map((item) => (
                <div key={item.id} className="space-y-3 py-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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
                      {formatMoney(item.requested_refund_amount)}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-slate-500">Status</p>
                      <p className="font-medium text-slate-950">
                        {formatStatus(item.status)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Reason</p>
                      <p className="font-medium text-slate-950">
                        {formatStatus(item.reason)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Condition</p>
                      <p className="font-medium text-slate-950">
                        {formatStatus(item.condition)}
                      </p>
                    </div>
                  </div>

                  {item.customer_note ? (
                    <p className="text-sm text-slate-600">
                      {item.customer_note}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Requested refund</span>
                <span className="font-bold text-slate-950">
                  {formatMoney(returnRequest.total_requested_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Approved refund</span>
                <span className="font-bold text-slate-950">
                  {formatMoney(returnRequest.total_approved_amount)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Status history
            </h2>

            {returnRequest.status_history.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">
                No status history yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {returnRequest.status_history.map((event) => (
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
              Request details
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Reason</dt>
                <dd className="font-medium text-slate-950">
                  {formatStatus(returnRequest.reason)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Resolution</dt>
                <dd className="font-medium text-slate-950">
                  {formatStatus(returnRequest.requested_resolution)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Refund method</dt>
                <dd className="font-medium text-slate-950">
                  {formatStatus(returnRequest.refund_method)}
                </dd>
              </div>
              {returnRequest.customer_note ? (
                <div>
                  <dt className="text-slate-500">Customer note</dt>
                  <dd className="font-medium text-slate-950">
                    {returnRequest.customer_note}
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
                  {formatDate(returnRequest.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Reviewed</dt>
                <dd className="font-medium text-slate-950">
                  {formatDate(returnRequest.reviewed_at)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Closed</dt>
                <dd className="font-medium text-slate-950">
                  {formatDate(returnRequest.closed_at)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
