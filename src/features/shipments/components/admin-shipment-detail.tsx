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
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-slate-500">Loading shipment...</p>
      </main>
    );
  }

  if (error && !shipment) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Link
          href="/admin/shipments"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to shipments
        </Link>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/admin/shipments"
        className="text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        ← Back to shipments
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Shipment
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {shipment.shipment_number}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Order {shipment.order_number} · {shipment.user_email}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-800">
            {shipment.seller_name
              ? `Seller: ${shipment.seller_name}`
              : "Legacy order shipment"}
            {shipment.seller_status
              ? ` · Fulfillment: ${shipment.seller_status.replaceAll("_", " ")}`
              : ""}
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
          {shipment.status_display || getShipmentStatusLabel(shipment.status)}
        </span>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Delivery address
            </h2>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Receiver</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {shipment.receiver_name}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {shipment.receiver_phone}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">City</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {shipment.city}, {shipment.province}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Postal code</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {shipment.postal_code}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Address</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {shipment.address}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Shipment events
            </h2>

            {shipment.events.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No shipment events yet.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {shipment.events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <p className="text-sm font-medium text-slate-950">
                      {event.old_status
                        ? `${getShipmentStatusLabel(event.old_status)} → ${getShipmentStatusLabel(event.new_status)}`
                        : getShipmentStatusLabel(event.new_status)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(event.created_at)}
                      {event.created_by_name
                        ? ` · ${event.created_by_name}`
                        : ""}
                    </p>
                    {event.message ? (
                      <p className="mt-2 text-sm text-slate-600">
                        {event.message}
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
              Shipment summary
            </h2>

            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Carrier</dt>
                <dd className="font-semibold text-slate-950">
                  {shipment.carrier_display || shipment.carrier}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Shipping cost</dt>
                <dd className="font-semibold text-slate-950">
                  {formatMoney(shipment.shipping_cost)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Tracking</dt>
                <dd className="text-right">
                  <p className="font-semibold text-slate-950">
                    {shipment.tracking_number || "—"}
                  </p>
                  {shipment.tracking_url ? (
                    <a
                      href={shipment.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs font-medium text-slate-600 underline hover:text-slate-950"
                    >
                      Open tracking
                    </a>
                  ) : null}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Shipped at</dt>
                <dd className="font-semibold text-slate-950">
                  {formatDateTime(shipment.shipped_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Delivered at</dt>
                <dd className="font-semibold text-slate-950">
                  {formatDateTime(shipment.delivered_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Cancelled at</dt>
                <dd className="font-semibold text-slate-950">
                  {formatDateTime(shipment.cancelled_at)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Admin action
            </h2>

            <label className="mt-5 block space-y-2 text-sm">
              <span className="font-medium text-slate-700">Note</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Add a short shipment note."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
              />
            </label>

            {canMarkShipped ? (
              <div className="mt-4 space-y-3">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-slate-700">
                    Tracking number
                  </span>
                  <input
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-slate-400"
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-slate-700">
                    Tracking URL
                  </span>
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(event) => setTrackingUrl(event.target.value)}
                    placeholder="https://..."
                    className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-slate-400"
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {canMarkReady ? (
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => void runAction("ready")}
                  className="flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark ready
                </button>
              ) : null}

              {canMarkShipped ? (
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => void runAction("shipped")}
                  className="flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark shipped
                </button>
              ) : null}

              {canMarkDelivered ? (
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => void runAction("delivered")}
                  className="flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark delivered
                </button>
              ) : null}

              {canCancel ? (
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => void runAction("cancel")}
                  className="flex h-11 w-full items-center justify-center rounded-2xl border border-red-200 px-5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel shipment
                </button>
              ) : null}

              {!canMarkReady &&
              !canMarkShipped &&
              !canMarkDelivered &&
              !canCancel ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  No shipment action is available for the current status.
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
