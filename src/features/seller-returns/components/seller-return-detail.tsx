"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  type SellerReturnDetail as SellerReturnDetailType,
  type SellerReturnUser,
  getSellerReturn,
} from "@/features/seller-returns/api";
import { StatusBadge, statusTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DetailList, Timeline } from "@/components/ui/data-display";
import { Breadcrumbs, PageHeader } from "@/components/ui/page-header";
import { Notice, Skeleton } from "@/components/ui/states";
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
      <main className="grid gap-6" aria-busy="true">
        <p role="status" className="sr-only">Loading return request...</p>
        <Skeleton className="h-24 max-w-lg" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
      </main>
    );
  }

  if (error && !returnRequest) {
    return (
      <main className="grid max-w-2xl gap-4">
        <Breadcrumbs items={[{ href: "/seller/returns", label: "Seller returns" }, { label: "Return" }]} />
        <Notice tone="danger" title="Could not load this return">{error}</Notice>
        <div><Link href="/seller/returns" className={buttonStyles({ variant: "secondary" })}>Back to seller returns</Link></div>
      </main>
    );
  }

  if (!returnRequest) {
    return null;
  }

  return (
    <main className="grid gap-6">
      <PageHeader eyebrow="Seller return view"
        title={<span className="font-mono text-[1.625rem] tracking-tight sm:text-[1.875rem]">{returnRequest.request_number}</span>}
        description={<>Order <span className="font-mono text-foreground">{returnRequest.order_number}</span> · Customer {getCustomerLabel(returnRequest.customer)}</>}
        crumbs={[{ href: "/seller/returns", label: "Seller returns" }, { label: "Return details" }]}
        actions={<StatusBadge status={returnRequest.status} label={getStatusLabel(returnRequest.status)} className="px-3 py-1 text-sm" />} />

      <Notice tone="info">
        MallByte support handles approval, rejection, receiving, and refunds.
        Sellers can view the return details but cannot complete refunds.
      </Notice>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="grid min-w-0 gap-6" aria-label="Return contents">
          <Card>
            <CardHeader title="Returned products" description={`${returnRequest.items.length} item${returnRequest.items.length === 1 ? "" : "s"} in this request`} />
            <ul className="mt-5 grid gap-3">
              {returnRequest.items.map((item) => (
                <li key={item.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground">{item.product_name}</h3>
                      <p className="mt-0.5 text-xs text-muted"><span className="font-mono">SKU: {item.product_sku || "—"}</span> · Quantity: {item.quantity}</p>
                    </div>
                    <StatusBadge status={item.status} label={getStatusLabel(item.status)} />
                  </div>
                  <DetailList className="mt-4 border-t border-line pt-4" items={[
                    { label: "Return reason", value: getReturnValueLabel(item.reason) },
                    { label: "Condition", value: getReturnValueLabel(item.condition) },
                    { label: "Requested refund", value: <span data-numeric>{formatMoney(item.requested_refund_amount)}</span> },
                    { label: "Approved refund", value: <span data-numeric>{formatMoney(item.approved_refund_amount)}</span> },
                  ]} />
                  {item.customer_note ? (
                    <blockquote className="mt-4 rounded-lg border-l-2 border-line-strong bg-sunken/60 px-4 py-3 text-sm text-slate-700">
                      <p className="text-xs font-medium text-muted">Customer note</p>
                      <p className="mt-1">{item.customer_note}</p>
                    </blockquote>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Status history" />
            {returnRequest.status_history.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No history entries yet.</p>
            ) : (
              <Timeline className="mt-5" items={returnRequest.status_history.map((history, index) => ({
                id: history.id,
                title: history.old_status
                  ? `${getStatusLabel(history.old_status)} → ${getStatusLabel(history.new_status)}`
                  : getStatusLabel(history.new_status),
                meta: `${formatDateTime(history.created_at)}${history.changed_by ? ` · ${history.changed_by}` : ""}`,
                description: history.note || undefined,
                tone: index === returnRequest.status_history.length - 1 ? statusTone(history.new_status) : "neutral",
              }))} />
            )}
          </Card>
        </section>

        <aside className="grid gap-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader title="Refund summary" />
            <dl className="mt-4 grid gap-3 text-sm">
              {([
                ["Requested", formatMoney(returnRequest.total_requested_amount)],
                ["Approved", formatMoney(returnRequest.total_approved_amount)],
                ["Refund method", getReturnValueLabel(returnRequest.refund_method)],
                ["Reviewed by", returnRequest.reviewed_by ?? "—"],
                ["Reviewed at", formatDateTime(returnRequest.reviewed_at)],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium text-foreground" data-numeric>{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Seller permissions" />
            <p className="mt-3 text-sm leading-6 text-muted">
              This view is read-only. The platform admin is responsible for the
              final return decision and refund completion.
            </p>
          </Card>
        </aside>
      </div>
    </main>
  );
}
