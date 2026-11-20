"use client";

import { useEffect, useState } from "react";

import {
  getOrderShipments,
  getShipmentCarrierLabel,
  getShipmentStatusLabel,
  type ShipmentDetail,
} from "@/features/shipments/api";

import { getApiErrorMessage } from "@/lib/api/errors";

type OrderShipmentTrackingProps = {
  orderId: number;
};

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function getStatusClass(status: string) {
  if (status === "delivered") {
    return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200";
  }

  if (["shipped", "in_transit", "out_for_delivery"].includes(status)) {
    return "bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-200";
  }

  if (["failed", "returned", "cancelled"].includes(status)) {
    return "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200";
  }

  return "bg-yellow-100 text-yellow-700";
}

export function OrderShipmentTracking({ orderId }: OrderShipmentTrackingProps) {
  const [shipments, setShipments] = useState<ShipmentDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadShipments() {
      try {
        const data = await getOrderShipments(orderId);

        if (!cancelled) {
          setShipments(data);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(getApiErrorMessage(caughtError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadShipments();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (isLoading) {
    return (
      <section className="mt-8 rounded-3xl border border-line p-5">
        <h2 className="text-lg font-semibold text-foreground">
          Shipment tracking
        </h2>

        <p className="mt-4 text-sm text-muted">
          Loading shipment information...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-5">
        <h2 className="text-lg font-semibold text-red-800">
          Shipment tracking
        </h2>

        <p className="mt-2 text-sm text-danger">
          Could not load shipment information.
        </p>

        <p className="mt-1 text-sm text-danger">{error}</p>
      </section>
    );
  }

  if (!shipments.length) {
    return (
      <section className="mt-8 rounded-3xl border border-line p-5">
        <h2 className="text-lg font-semibold text-foreground">
          Shipment tracking
        </h2>

        <div className="mt-4 rounded-xl border border-line bg-sunken/60 p-4">
          <p className="text-sm font-medium text-slate-700">
            No shipment has been created yet.
          </p>

          <p className="mt-1 text-xs leading-5 text-muted">
            Tracking information will appear here after your order is prepared
            for shipping.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Shipment tracking
        </h2>

        <p className="mt-1 text-sm text-muted">
          {shipments.length} shipment
          {shipments.length === 1 ? "" : "s"} for this order.
        </p>
      </div>

      {shipments.map((shipment) => (
        <article
          key={shipment.id}
          className="rounded-3xl border border-line p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {shipment.seller_name || "Order shipment"}
              </h3>

              <p className="mt-1 text-sm text-muted">
                {shipment.shipment_number}
              </p>
            </div>

            <span
              className={[
                "w-fit rounded-full px-3 py-1 text-xs font-medium",
                getStatusClass(shipment.status),
              ].join(" ")}
            >
              {shipment.status_display ||
                getShipmentStatusLabel(shipment.status)}
            </span>
          </div>

          <div className="mt-5 grid gap-4 rounded-xl border border-line bg-sunken/60 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted">
                Carrier
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {shipment.carrier_display ||
                  getShipmentCarrierLabel(shipment.carrier)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted">
                Tracking number
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {shipment.tracking_number || "Not available"}
              </p>

              {shipment.tracking_url ? (
                <a
                  href={shipment.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm font-medium text-ember-700 underline underline-offset-4"
                >
                  Track shipment
                </a>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-medium text-muted">
                Shipped at
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {formatDate(shipment.shipped_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted">
                Delivered at
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {formatDate(shipment.delivered_at)}
              </p>
            </div>
          </div>

          {shipment.events.length ? (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-foreground">
                Delivery updates
              </h4>

              <div className="mt-3 space-y-3">
                {shipment.events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-line p-4"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-slate-900">
                        {event.old_status
                          ? `${getShipmentStatusLabel(
                              event.old_status,
                            )} → ${getShipmentStatusLabel(event.new_status)}`
                          : getShipmentStatusLabel(event.new_status)}
                      </p>

                      <p className="text-xs text-muted">
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
          ) : (
            <p className="mt-5 text-sm text-muted">
              No delivery updates yet.
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
