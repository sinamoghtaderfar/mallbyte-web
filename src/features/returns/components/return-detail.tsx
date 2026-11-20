"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { RotateCcw } from "lucide-react";

import { StatusBadge, statusTone } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailList, Timeline } from "@/components/ui/data-display";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
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
  const [confirmCancel, setConfirmCancel] = useState(false);

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
      <div className="grid gap-6" aria-busy="true">
        <p role="status" className="sr-only">Loading return request...</p>
        <Skeleton className="h-24 max-w-lg" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid max-w-2xl gap-4">
        <Notice tone="danger" title="We couldn't load this return">{error}</Notice>
        <div><Link href="/returns" className={buttonStyles({ variant: "secondary" })}>Back to returns</Link></div>
      </div>
    );
  }

  if (!returnRequest) {
    return (
      <EmptyState icon={<RotateCcw size={24} />} title="Return request not found."
        action={<Link href="/returns" className={buttonStyles({ variant: "secondary" })}>Back to returns</Link>} />
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader eyebrow="Return request" title={returnRequest.request_number}
        crumbs={[{ href: "/returns", label: "Returns" }, { label: "Return details" }]}
        actions={canCancel ? (
          <Button variant="secondary" onClick={() => setConfirmCancel(true)} loading={isCancelling}
            className="text-rose-700 hover:border-rose-300 hover:bg-rose-50">
            {isCancelling ? "Cancelling..." : "Cancel return"}
          </Button>
        ) : null} />

      <div className="flex flex-wrap gap-2">
        <StatusBadge status={returnRequest.status} label={formatStatus(returnRequest.status)} />
        <Link href={`/orders/${returnRequest.order}`} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium leading-5 text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-200">
          Order: <span className="ml-1 font-mono">{returnRequest.order_number}</span>
        </Link>
      </div>

      {actionMessage ? <Notice tone="success">{actionMessage}</Notice> : null}
      {actionError ? <Notice tone="danger">{actionError}</Notice> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <CardHeader title="Return items" />
            <ul className="mt-4 divide-y divide-line">
              {returnRequest.items.map((item) => (
                <li key={item.id} className="grid gap-3 py-4 first:pt-0">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.product_name}</p>
                      <p className="mt-0.5 text-xs text-muted"><span className="font-mono">SKU: {item.product_sku}</span> · Quantity: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground" data-numeric>{formatMoney(item.requested_refund_amount)}</span>
                  </div>
                  <DetailList columns={3} className="rounded-xl bg-sunken/60 p-4" items={[
                    { label: "Status", value: <StatusBadge status={item.status} label={formatStatus(item.status)} /> },
                    { label: "Reason", value: formatStatus(item.reason) },
                    { label: "Condition", value: formatStatus(item.condition) },
                  ]} />
                  {item.customer_note ? <p className="text-sm text-slate-700">{item.customer_note}</p> : null}
                </li>
              ))}
            </ul>
            <dl className="mt-2 grid gap-2 rounded-xl border border-line px-4 py-3 text-sm">
              <div className="flex items-center justify-between"><dt className="text-muted">Requested refund</dt><dd className="font-semibold text-foreground" data-numeric>{formatMoney(returnRequest.total_requested_amount)}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-muted">Approved refund</dt><dd className="font-semibold text-foreground" data-numeric>{formatMoney(returnRequest.total_approved_amount)}</dd></div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Status history" />
            {returnRequest.status_history.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No status history yet.</p>
            ) : (
              <Timeline className="mt-5" items={returnRequest.status_history.map((event, index) => ({
                id: event.id,
                title: `${formatStatus(event.old_status || "created")} → ${formatStatus(event.new_status)}`,
                meta: formatDate(event.created_at),
                description: event.note || undefined,
                tone: index === returnRequest.status_history.length - 1 ? statusTone(event.new_status) : "neutral",
              }))} />
            )}
          </Card>
        </div>

        <aside className="grid gap-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader title="Request details" />
            <DetailList className="mt-4" columns={1} items={[
              { label: "Reason", value: formatStatus(returnRequest.reason) },
              { label: "Resolution", value: formatStatus(returnRequest.requested_resolution) },
              { label: "Refund method", value: formatStatus(returnRequest.refund_method) },
              ...(returnRequest.customer_note ? [{ label: "Customer note", value: returnRequest.customer_note }] : []),
            ]} />
          </Card>
          <Card>
            <CardHeader title="Important dates" />
            <DetailList className="mt-4" columns={1} items={[
              { label: "Created", value: formatDate(returnRequest.created_at) },
              { label: "Reviewed", value: formatDate(returnRequest.reviewed_at) },
              { label: "Closed", value: formatDate(returnRequest.closed_at) },
            ]} />
          </Card>
        </aside>
      </div>

      {confirmCancel ? (
        <ConfirmDialog title="Cancel this return request?" description="The request is withdrawn. You can start a new return from the order while it is still eligible."
          confirmLabel="Cancel return" cancelLabel="Keep request" tone="danger" busy={isCancelling}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => { void handleCancel().finally(() => setConfirmCancel(false)); }} />
      ) : null}
    </section>
  );
}
