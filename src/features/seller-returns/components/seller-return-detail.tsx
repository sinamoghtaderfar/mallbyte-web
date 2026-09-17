"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  type SellerReturnDetail as SellerReturnDetailType,
  type SellerReturnUser,
  getSellerReturn,
} from "@/features/seller-returns/api";
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

const returnValueLabels: Record<string, string> = {
  original_payment: "Original payment method",
  store_credit: "Store credit",
  manual_refund: "Manual refund",
  no_refund: "No refund",

  damaged: "Damaged item",
  defective: "Defective item",
  wrong_item: "Wrong item",
  missing_parts: "Missing parts",
  not_as_described: "Not as described",
  changed_mind: "Changed mind",
  other: "Other",

  new: "New",
  opened: "Opened",
  used: "Used",
  damaged_condition: "Damaged",

  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  received: "Received",
  refunded: "Refunded",
  cancelled: "Cancelled",

  submitted: "Submitted",
  under_review: "Under review",
  waiting_for_item: "Waiting for item",
  item_received: "Item received",
  inspecting: "Inspecting",
  refund_pending: "Refund pending",
  closed: "Closed",
};

function getReturnValueLabel(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return (
    returnValueLabels[value] ??
    value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

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

function getCustomerLabel(customer: string | number | SellerReturnUser) {
  if (typeof customer === "object") {
    return customer.full_name || customer.email;
  }

  return String(customer);
}

export function SellerReturnDetail() {
  const params = useParams<{ id: string }>();
  const returnId = params.id;

  const [returnRequest, setReturnRequest] =
    useState<SellerReturnDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReturn() {
      try {
        setIsLoading(true);
        setError("");

        const data = await getSellerReturn(returnId);

        if (isMounted) {
          setReturnRequest(data);
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

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-slate-500">Loading return request...</p>
      </main>
    );
  }

  if (error && !returnRequest) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Link
          href="/seller/returns"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to seller returns
        </Link>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </main>
    );
  }

  if (!returnRequest) {
    return null;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/seller/returns"
        className="text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        ← Back to seller returns
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Seller return view
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {returnRequest.request_number}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Order {returnRequest.order_number} · Customer{" "}
            {getCustomerLabel(returnRequest.customer)}
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
          {getStatusLabel(returnRequest.status)}
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
        MallByte support handles approval, rejection, receiving, and refunds.
        Sellers can view the return details but cannot complete refunds.
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Returned products
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
                        SKU: {item.product_sku || "—"}
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
                      <dt className="text-slate-500">Return reason</dt>
                      <dd className="mt-1 font-medium text-slate-950">
                        {getReturnValueLabel(item.reason)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Condition</dt>
                      <dd className="mt-1 font-medium text-slate-950">
                        {getReturnValueLabel(item.condition)}
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
                  {getReturnValueLabel(returnRequest.refund_method)}
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
              Seller permissions
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              This view is read-only. The platform admin is responsible for the
              final return decision and refund completion.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
