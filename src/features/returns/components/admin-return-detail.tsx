"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  type AdminReturnDetail as AdminReturnDetailType,
  approveAdminReturn,
  getAdminReturn,
  markAdminReturnReceived,
  markAdminReturnRefunded,
  rejectAdminReturn,
} from "@/features/returns/admin-api";
import { getApiErrorMessage } from "@/lib/api/errors";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  waiting_for_item: "Waiting for item",
  item_received: "Item received",
  inspecting: "Inspecting",
  refund_pending: "Refund pending",
  refunded: "Refunded",
  replaced: "Replaced",
  cancelled: "Cancelled",
  closed: "Closed",
};

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function getStatusLabel(status: string) {
  return statusLabels[status] ?? status;
}

export function AdminReturnDetail() {
  const params = useParams<{ id: string }>();
  const returnId = params.id;

  const [returnRequest, setReturnRequest] =
    useState<AdminReturnDetailType | null>(null);
  const [note, setNote] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReturn() {
      try {
        setIsLoading(true);
        setError("");
        const data = await getAdminReturn(returnId);

        if (isMounted) {
          setReturnRequest(data);
          setApprovedAmount(String(Number(data.total_requested_amount)));
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getApiErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReturn();

    return () => {
      isMounted = false;
    };
  }, [returnId]);

  async function runAction(
    action: "approve" | "reject" | "received" | "refunded",
  ) {
    if (!returnRequest) {
      return;
    }

    try {
      setIsWorking(true);
      setError("");
      setActionMessage("");

      let updatedReturn: AdminReturnDetailType;

      if (action === "approve") {
        updatedReturn = await approveAdminReturn(returnRequest.id, {
          note,
          approved_amount: approvedAmount,
        });
        setActionMessage("Return request approved.");
      } else if (action === "reject") {
        updatedReturn = await rejectAdminReturn(returnRequest.id, { note });
        setActionMessage("Return request rejected.");
      } else if (action === "received") {
        updatedReturn = await markAdminReturnReceived(returnRequest.id, {
          note,
        });
        setActionMessage("Returned item marked as received.");
      } else {
        updatedReturn = await markAdminReturnRefunded(returnRequest.id, {
          note,
        });
        setActionMessage("Return request marked as refunded.");
      }

      setReturnRequest(updatedReturn);
      setNote("");
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setIsWorking(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-slate-500">Loading return request...</p>
        </div>
      </main>
    );
  }

  if (error && !returnRequest) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/admin/returns"
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            ← Back to admin returns
          </Link>

          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!returnRequest) {
    return null;
  }

  const canReview = ["submitted", "under_review"].includes(
    returnRequest.status,
  );
  const canMarkReceived = ["approved", "waiting_for_item"].includes(
    returnRequest.status,
  );
  const canMarkRefunded = [
    "item_received",
    "inspecting",
    "refund_pending",
  ].includes(returnRequest.status);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/returns"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to admin returns
        </Link>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Return request
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              {returnRequest.request_number}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Order {returnRequest.order_number} · Customer{" "}
              {returnRequest.customer}
            </p>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            {getStatusLabel(returnRequest.status)}
          </span>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {actionMessage}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Returned items
              </h2>

              <div className="mt-5 space-y-4">
                {returnRequest.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-950">
                          {item.product_name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          SKU: {item.product_sku}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {getStatusLabel(item.status)}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-slate-500">Reason</dt>
                        <dd className="mt-1 font-medium text-slate-950">
                          {item.reason}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Condition</dt>
                        <dd className="mt-1 font-medium text-slate-950">
                          {item.condition}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Requested refund</dt>
                        <dd className="mt-1 font-medium text-slate-950">
                          {formatMoney(item.requested_refund_amount)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Approved refund</dt>
                        <dd className="mt-1 font-medium text-slate-950">
                          {formatMoney(item.approved_refund_amount)}
                        </dd>
                      </div>
                    </dl>

                    {item.customer_note ? (
                      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <p className="font-medium text-slate-900">
                          Customer note
                        </p>
                        <p className="mt-1">{item.customer_note}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Status history
              </h2>

              {returnRequest.status_history.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No history entries yet.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {returnRequest.status_history.map((history) => (
                    <div
                      key={history.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <p className="text-sm font-medium text-slate-950">
                        {history.old_status
                          ? `${getStatusLabel(history.old_status)} → ${getStatusLabel(
                              history.new_status,
                            )}`
                          : getStatusLabel(history.new_status)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(history.created_at)}
                        {history.changed_by ? ` · ${history.changed_by}` : ""}
                      </p>
                      {history.note ? (
                        <p className="mt-2 text-sm text-slate-600">
                          {history.note}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Refund summary
              </h2>

              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Requested</dt>
                  <dd className="font-semibold text-slate-950">
                    {formatMoney(returnRequest.total_requested_amount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Approved</dt>
                  <dd className="font-semibold text-slate-950">
                    {formatMoney(returnRequest.total_approved_amount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Refund method</dt>
                  <dd className="font-semibold text-slate-950">
                    {returnRequest.refund_method}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Reviewed by</dt>
                  <dd className="font-semibold text-slate-950">
                    {returnRequest.reviewed_by ?? "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Reviewed at</dt>
                  <dd className="font-semibold text-slate-950">
                    {formatDateTime(returnRequest.reviewed_at)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Admin action
              </h2>

              <label className="mt-5 block space-y-2 text-sm">
                <span className="font-medium text-slate-700">
                  Internal note
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  placeholder="Add a short note for this decision."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                />
              </label>

              {canReview ? (
                <label className="mt-4 block space-y-2 text-sm">
                  <span className="font-medium text-slate-700">
                    Approved refund amount
                  </span>
                  <input
                    value={approvedAmount}
                    onChange={(event) => setApprovedAmount(event.target.value)}
                    inputMode="numeric"
                    className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-slate-400"
                  />
                </label>
              ) : null}

              <div className="mt-5 space-y-3">
                {canReview ? (
                  <>
                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => void runAction("approve")}
                      className="flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Approve return
                    </button>

                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => void runAction("reject")}
                      className="flex h-11 w-full items-center justify-center rounded-2xl border border-red-200 px-5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject return
                    </button>
                  </>
                ) : null}

                {canMarkReceived ? (
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() => void runAction("received")}
                    className="flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark item received
                  </button>
                ) : null}

                {canMarkRefunded ? (
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() => void runAction("refunded")}
                    className="flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark refunded
                  </button>
                ) : null}

                {!canReview && !canMarkReceived && !canMarkRefunded ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    No admin action is available for the current status.
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
