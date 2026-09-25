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
    return "bg-green-100 text-green-700";
  }

  if (["shipped", "in_transit", "out_for_delivery"].includes(status)) {
    return "bg-blue-100 text-blue-700";
  }

  if (["failed", "returned", "cancelled"].includes(status)) {
    return "bg-red-100 text-red-700";
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
      <section className="mt-8 rounded-3xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-950">
          Shipment tracking
        </h2>

        <p className="mt-4 text-sm text-slate-500">
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

        <p className="mt-2 text-sm text-red-700">
          Could not load shipment information.
        </p>

        <p className="mt-1 text-sm text-red-700">{error}</p>
      </section>
    );
  }

  if (!shipments.length) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-950">
          Shipment tracking
        </h2>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">
            No shipment has been created yet.
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
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
        <h2 className="text-lg font-semibold text-slate-950">
          Shipment tracking
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {shipments.length} shipment
          {shipments.length === 1 ? "" : "s"} for this order.
        </p>
      </div>

      {shipments.map((shipment) => (
        <article
          key={shipment.id}
          className="rounded-3xl border border-slate-200 p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-950">
                {shipment.seller_name || "Order shipment"}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
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

          <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Carrier
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {shipment.carrier_display ||
                  getShipmentCarrierLabel(shipment.carrier)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
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
                  className="mt-1 inline-block text-sm font-medium text-blue-700 underline underline-offset-4"
                >
                  Track shipment
                </a>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Shipped at
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {formatDate(shipment.shipped_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Delivered at
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {formatDate(shipment.delivered_at)}
              </p>
            </div>
          </div>

          {shipment.events.length ? (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-950">
                Delivery updates
              </h4>

              <div className="mt-3 space-y-3">
                {shipment.events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-slate-900">
                        {event.old_status
                          ? `${getShipmentStatusLabel(
                              event.old_status,
                            )} → ${getShipmentStatusLabel(event.new_status)}`
                          : getShipmentStatusLabel(event.new_status)}
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
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              No delivery updates yet.
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
