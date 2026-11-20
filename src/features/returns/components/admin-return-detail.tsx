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
import { Banknote, Check, PackageCheck, X } from "lucide-react";

import { humanize, StatusBadge, statusTone } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailList, Timeline } from "@/components/ui/data-display";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Breadcrumbs, PageHeader } from "@/components/ui/page-header";
import { Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

type ReturnAction = "approve" | "reject" | "received" | "refunded";

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
  const [pendingAction, setPendingAction] = useState<ReturnAction | null>(null);

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
      <main className="grid gap-6" aria-busy="true">
        <p role="status" className="sr-only">Loading return request...</p>
        <Skeleton className="h-24 max-w-lg" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>
      </main>
    );
  }

  if (error && !returnRequest) {
    return (
      <main className="grid max-w-2xl gap-4">
        <Breadcrumbs items={[{ href: "/admin/returns", label: "Returns" }, { label: "Return" }]} />
        <Notice tone="danger" title="Could not load this return">{error}</Notice>
        <div><Link href="/admin/returns" className={buttonStyles({ variant: "secondary" })}>Back to admin returns</Link></div>
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

  const confirmCopy: Record<ReturnAction, { title: string; description: string; confirm: string; danger?: boolean }> = {
    approve: { title: `Approve ${returnRequest.request_number}?`, description: approvedAmount ? `The approved refund amount will be ${formatMoney(approvedAmount)}. The customer is notified to send the item back.` : "The customer is notified to send the item back.", confirm: "Approve return" },
    reject: { title: `Reject ${returnRequest.request_number}?`, description: "The customer sees the decision and your note. This ends the return request.", confirm: "Reject return", danger: true },
    received: { title: "Mark the item as received?", description: "Confirms the returned item arrived at the warehouse.", confirm: "Mark item received" },
    refunded: { title: "Mark this return as refunded?", description: "Records that the refund was completed. Make sure the payment provider refund has been issued.", confirm: "Mark refunded" },
  };

  return (
    <main className="grid gap-6">
      <PageHeader eyebrow="Return request"
        title={<span className="font-mono text-[1.625rem] tracking-tight sm:text-[1.875rem]">{returnRequest.request_number}</span>}
        description={<>Order <span className="font-mono text-foreground">{returnRequest.order_number}</span> · Customer {returnRequest.customer}</>}
        crumbs={[{ href: "/admin/returns", label: "Returns" }, { label: "Return details" }]}
        actions={<StatusBadge status={returnRequest.status} label={getStatusLabel(returnRequest.status)} className="px-3 py-1 text-sm" />} />

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {actionMessage ? <Notice tone="success">{actionMessage}</Notice> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="grid min-w-0 gap-6" aria-label="Return contents">
          <Card>
            <CardHeader title="Returned items" description={`${returnRequest.items.length} item${returnRequest.items.length === 1 ? "" : "s"} in this request`} />
            <ul className="mt-5 grid gap-3">
              {returnRequest.items.map((item) => (
                <li key={item.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground">{item.product_name}</h3>
                      <p className="mt-0.5 text-xs text-muted"><span className="font-mono">SKU: {item.product_sku}</span> · Quantity: {item.quantity}</p>
                    </div>
                    <StatusBadge status={item.status} label={getStatusLabel(item.status)} />
                  </div>
                  <DetailList className="mt-4 border-t border-line pt-4" items={[
                    { label: "Reason", value: humanize(item.reason) },
                    { label: "Condition", value: humanize(item.condition) },
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
          <Card className={canReview || canMarkReceived || canMarkRefunded ? "border-ink/15 ring-1 ring-ink/5" : ""}>
            <CardHeader title="Admin action" description="Decisions are recorded in the return history." />
            <div className="mt-5 grid gap-4">
              <Field label="Internal note" htmlFor="admin-return-note">
                <Textarea id="admin-return-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3}
                  placeholder="Add a short note for this decision." />
              </Field>
              {canReview ? (
                <Field label="Approved refund amount" htmlFor="admin-return-amount" hintId="admin-return-amount-hint"
                  hint={`Requested: ${formatMoney(returnRequest.total_requested_amount)}`}>
                  <Input id="admin-return-amount" value={approvedAmount} onChange={(event) => setApprovedAmount(event.target.value)}
                    inputMode="decimal" aria-describedby="admin-return-amount-hint" />
                </Field>
              ) : null}
              <div className="grid gap-2">
                {canReview ? (
                  <>
                    <Button disabled={isWorking} onClick={() => setPendingAction("approve")}><Check size={16} aria-hidden="true" />Approve return</Button>
                    <Button variant="secondary" disabled={isWorking} onClick={() => setPendingAction("reject")} className="text-rose-700 hover:border-rose-300 hover:bg-rose-50"><X size={16} aria-hidden="true" />Reject return</Button>
                  </>
                ) : null}
                {canMarkReceived ? <Button disabled={isWorking} onClick={() => setPendingAction("received")}><PackageCheck size={16} aria-hidden="true" />Mark item received</Button> : null}
                {canMarkRefunded ? <Button disabled={isWorking} onClick={() => setPendingAction("refunded")}><Banknote size={16} aria-hidden="true" />Mark refunded</Button> : null}
                {!canReview && !canMarkReceived && !canMarkRefunded ? (
                  <p className="rounded-xl border border-line bg-sunken/60 p-4 text-sm text-muted">No admin action is available for the current status.</p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Refund summary" />
            <dl className="mt-4 grid gap-3 text-sm">
              {([
                ["Requested", formatMoney(returnRequest.total_requested_amount)],
                ["Approved", formatMoney(returnRequest.total_approved_amount)],
                ["Refund method", humanize(returnRequest.refund_method)],
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
        </aside>
      </div>

      {pendingAction ? (
        <ConfirmDialog title={confirmCopy[pendingAction].title} description={confirmCopy[pendingAction].description}
          confirmLabel={confirmCopy[pendingAction].confirm} tone={confirmCopy[pendingAction].danger ? "danger" : "primary"}
          busy={isWorking} onCancel={() => setPendingAction(null)}
          onConfirm={() => { const action = pendingAction; void runAction(action).finally(() => setPendingAction(null)); }} />
      ) : null}
    </main>
  );
}
