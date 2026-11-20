"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  cancelShipment,
  getShipment,
  getShipmentStatusLabel,
  markShipmentDelivered,
  markShipmentReady,
  markShipmentShipped,
  type ShipmentDetail,
} from "@/features/shipments/api";
import { ArrowLeft, CircleCheck, ExternalLink, PackageCheck, Truck } from "lucide-react";

import { StatusBadge, statusTone } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailList, Timeline } from "@/components/ui/data-display";
import { Field, Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

export function AdminShipmentDetail() {
  const params = useParams<{ id: string }>();
  const shipmentId = params.id;

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [note, setNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadShipment() {
      try {
        setIsLoading(true);
        setError("");
        const data = await getShipment(shipmentId);

        if (isMounted) {
          setShipment(data);
          setTrackingNumber(data.tracking_number || "");
          setTrackingUrl(data.tracking_url || "");
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

    void loadShipment();

    return () => {
      isMounted = false;
    };
  }, [shipmentId]);

  async function runAction(
    action: "ready" | "shipped" | "delivered" | "cancel",
  ) {
    if (!shipment) {
      return;
    }

    try {
      setIsWorking(true);
      setError("");
      setMessage("");

      let updatedShipment: ShipmentDetail;

      if (action === "ready") {
        updatedShipment = await markShipmentReady(shipment.id, { note });
        setMessage("Shipment marked as ready.");
      } else if (action === "shipped") {
        updatedShipment = await markShipmentShipped(shipment.id, {
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          note,
        });
        setMessage("Shipment marked as shipped.");
      } else if (action === "delivered") {
        updatedShipment = await markShipmentDelivered(shipment.id, { note });
        setMessage("Shipment marked as delivered.");
      } else {
        updatedShipment = await cancelShipment(shipment.id, { note });
        setMessage("Shipment cancelled.");
      }

      setShipment(updatedShipment);
      setNote("");
      setTrackingNumber(updatedShipment.tracking_number || "");
      setTrackingUrl(updatedShipment.tracking_url || "");
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setIsWorking(false);
    }
  }

  if (isLoading) {
    return (
      <main className="grid gap-6" aria-busy="true">
        <p role="status" className="sr-only">Loading shipment...</p>
        <Skeleton className="h-24 max-w-lg" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>
      </main>
    );
  }

  if (error && !shipment) {
    return (
      <main className="grid max-w-2xl gap-4">
        <Notice tone="danger" title="Could not load this shipment">{error}</Notice>
        <div><Link href="/admin/shipments" className={buttonStyles({ variant: "secondary" })}><ArrowLeft size={15} aria-hidden="true" />Back to shipments</Link></div>
      </main>
    );
  }

  if (!shipment) {
    return null;
  }

  const canMarkReady = shipment.status === "pending";
  const canMarkShipped = ["pending", "ready_to_ship"].includes(shipment.status);
  const canMarkDelivered = [
    "shipped",
    "in_transit",
    "out_for_delivery",
  ].includes(shipment.status);
  const canCancel = !["delivered", "cancelled"].includes(shipment.status);
  const hasAction = canMarkReady || canMarkShipped || canMarkDelivered || canCancel;

  return (
    <main className="grid gap-6">
      <div className="grid gap-4">
        <Link href="/admin/shipments" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline">
          <ArrowLeft size={15} aria-hidden="true" />Back to shipments
        </Link>
        <PageHeader eyebrow="Shipment"
          title={<span className="font-mono text-[1.625rem] tracking-tight sm:text-[1.875rem]">{shipment.shipment_number}</span>}
          description={<>
            Order <span className="font-mono text-foreground">{shipment.order_number}</span> · {shipment.user_email}
            <span className="mt-1 block font-medium text-slate-800">
              {shipment.seller_name ? `Seller: ${shipment.seller_name}` : "Legacy order shipment"}
              {shipment.seller_status ? ` · Fulfillment: ${shipment.seller_status.replaceAll("_", " ")}` : ""}
            </span>
          </>}
          actions={<StatusBadge status={shipment.status} label={shipment.status_display || getShipmentStatusLabel(shipment.status)} className="px-3 py-1 text-sm" />} />
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="grid min-w-0 gap-6" aria-label="Shipment details">
          <Card>
            <CardHeader title="Shipment events" description="Status changes recorded for this shipment, oldest first." />
            {shipment.events.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No shipment events yet.</p>
            ) : (
              <Timeline className="mt-5" items={shipment.events.map((event, index) => ({
                id: event.id,
                title: event.old_status
                  ? `${getShipmentStatusLabel(event.old_status)} → ${getShipmentStatusLabel(event.new_status)}`
                  : getShipmentStatusLabel(event.new_status),
                meta: `${formatDateTime(event.created_at)}${event.created_by_name ? ` · ${event.created_by_name}` : ""}`,
                description: event.message || undefined,
                tone: index === shipment.events.length - 1 ? statusTone(event.new_status) : "neutral",
              }))} />
            )}
          </Card>

          <Card>
            <CardHeader title="Delivery address" />
            <DetailList className="mt-5" items={[
              { label: "Receiver", value: shipment.receiver_name },
              { label: "Phone", value: shipment.receiver_phone, mono: true },
              { label: "City", value: `${shipment.city}, ${shipment.province}` },
              { label: "Postal code", value: shipment.postal_code, mono: true },
              { label: "Address", value: shipment.address, wide: true },
            ]} />
          </Card>
        </section>

        <aside className="grid gap-6 lg:sticky lg:top-24">
          <Card className={hasAction ? "border-ink/15 ring-1 ring-ink/5" : ""}>
            <CardHeader title="Admin action" description="Each change is recorded as a shipment event." />
            <div className="mt-5 grid gap-4">
              <Field label="Note" htmlFor="shipment-note">
                <Textarea id="shipment-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Add a short shipment note." />
              </Field>
              {canMarkShipped ? (
                <>
                  <Field label="Tracking number" htmlFor="shipment-tracking-number">
                    <Input id="shipment-tracking-number" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} className="font-mono" />
                  </Field>
                  <Field label="Tracking URL" htmlFor="shipment-tracking-url">
                    <Input id="shipment-tracking-url" type="url" value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} placeholder="https://..." />
                  </Field>
                </>
              ) : null}
              <div className="grid gap-2">
                {canMarkReady ? <Button variant="secondary" disabled={isWorking} onClick={() => void runAction("ready")}><PackageCheck size={16} aria-hidden="true" />Mark ready</Button> : null}
                {canMarkShipped ? <Button disabled={isWorking} onClick={() => void runAction("shipped")}><Truck size={16} aria-hidden="true" />Mark shipped</Button> : null}
                {canMarkDelivered ? <Button disabled={isWorking} onClick={() => void runAction("delivered")}><CircleCheck size={16} aria-hidden="true" />Mark delivered</Button> : null}
                {canCancel ? (
                  <Button variant="secondary" disabled={isWorking} onClick={() => setConfirmCancel(true)} className="text-rose-700 hover:border-rose-300 hover:bg-rose-50">
                    Cancel shipment
                  </Button>
                ) : null}
                {!hasAction ? (
                  <p className="rounded-xl border border-line bg-sunken/60 p-4 text-sm text-muted">No shipment action is available for the current status.</p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Shipment summary" />
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4"><dt className="text-muted">Carrier</dt><dd className="font-medium text-foreground">{shipment.carrier_display || shipment.carrier}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-muted">Shipping cost</dt><dd className="font-medium text-foreground" data-numeric>{formatMoney(shipment.shipping_cost)}</dd></div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted">Tracking</dt>
                <dd className="text-right">
                  <p className="font-mono font-medium text-foreground">{shipment.tracking_number || "—"}</p>
                  {shipment.tracking_url ? (
                    <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand underline-offset-4 hover:underline">
                      Open tracking<ExternalLink size={12} aria-hidden="true" />
                    </a>
                  ) : null}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4"><dt className="text-muted">Shipped at</dt><dd className="text-right font-medium text-foreground">{formatDateTime(shipment.shipped_at)}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-muted">Delivered at</dt><dd className="text-right font-medium text-foreground">{formatDateTime(shipment.delivered_at)}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-muted">Cancelled at</dt><dd className="text-right font-medium text-foreground">{formatDateTime(shipment.cancelled_at)}</dd></div>
            </dl>
          </Card>
        </aside>
      </div>

      {confirmCancel ? (
        <ConfirmDialog title={`Cancel shipment ${shipment.shipment_number}?`}
          description="The shipment stops here and the cancellation is recorded with your note. This cannot be reversed from this page."
          confirmLabel="Yes, cancel shipment" cancelLabel="Keep shipment" tone="danger" busy={isWorking}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => { void runAction("cancel").finally(() => setConfirmCancel(false)); }} />
      ) : null}
    </main>
  );
}
