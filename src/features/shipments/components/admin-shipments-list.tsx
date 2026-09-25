"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  createShipment,
  getEligibleShipmentOrders,
  getShipmentCarrierLabel,
  getShipments,
  getShipmentStatusLabel,
  SHIPMENT_CARRIER_LABELS,
  type EligibleShipmentOrder,
  type ShipmentCarrier,
  type ShipmentListItem,
  type ShipmentStatus,
} from "@/features/shipments/api";
import { getApiErrorMessage } from "@/lib/api/errors";

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString();
}

export function AdminShipmentsList() {
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [eligibleOrders, setEligibleOrders] = useState<EligibleShipmentOrder[]>(
    [],
  );
  const [statusFilter, setStatusFilter] = useState<"all" | ShipmentStatus>(
    "all",
  );
  const [carrier, setCarrier] = useState<ShipmentCarrier>("post");
  const [selectedSeller, setSelectedSeller] = useState<Record<number, string>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [creatingOrderId, setCreatingOrderId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadShippingData() {
    try {
      setIsLoading(true);
      setError("");

      const [shipmentData, eligibleOrderData] = await Promise.all([
        getShipments(),
        getEligibleShipmentOrders(),
      ]);

      setShipments(shipmentData);
      setEligibleOrders(eligibleOrderData);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialShippingData() {
      try {
        const [shipmentData, eligibleOrderData] = await Promise.all([
          getShipments(),
          getEligibleShipmentOrders(),
        ]);
        if (cancelled) return;
        setShipments(shipmentData);
        setEligibleOrders(eligibleOrderData);
      } catch (caughtError) {
        if (!cancelled) setError(getApiErrorMessage(caughtError));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadInitialShippingData();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateShipment(order: EligibleShipmentOrder) {
    const available = order.eligible_sellers ?? [];
    const sellerId =
      available.length === 1
        ? available[0].id
        : Number(selectedSeller[order.id] || 0);

    if (available.length > 1 && !sellerId) {
      setError("Please select the seller before creating a shipment.");
      return;
    }

    try {
      setCreatingOrderId(order.id);
      setError("");
      setMessage("");

      const shipment = await createShipment({
        order: order.id,
        carrier,
        ...(sellerId ? { seller: sellerId } : {}),
      });

      setMessage(
        `Shipment ${shipment.shipment_number} created for order ${order.order_number}${shipment.seller_name ? ` (${shipment.seller_name})` : ""}.`,
      );

      await loadShippingData();
      setSelectedSeller((previous) => ({ ...previous, [order.id]: "" }));
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setCreatingOrderId(null);
    }
  }

  const filteredShipments = useMemo(() => {
    if (statusFilter === "all") {
      return shipments;
    }

    return shipments.filter((shipment) => shipment.status === statusFilter);
  }, [shipments, statusFilter]);

  const pendingCount = shipments.filter(
    (shipment) => shipment.status === "pending",
  ).length;

  const inTransitCount = shipments.filter((shipment) =>
    ["shipped", "in_transit", "out_for_delivery"].includes(shipment.status),
  ).length;

  const deliveredCount = shipments.filter(
    (shipment) => shipment.status === "delivered",
  ).length;

  const statuses = Array.from(
    new Set(shipments.map((shipment) => shipment.status)),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Shipping management
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Create shipments for paid orders and manage shipment progress from
            preparation to delivery.
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Admin dashboard
        </Link>
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

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total shipments</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {shipments.length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">In transit</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {inTransitCount}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Delivered</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {deliveredCount}
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Eligible paid orders
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Create a separate shipment for each eligible seller. Orders remain
              here while another seller still needs a shipment.
            </p>
          </div>

          <label className="w-full space-y-1 text-sm sm:w-56">
            <span className="font-medium text-slate-700">Carrier</span>
            <select
              value={carrier}
              onChange={(event) =>
                setCarrier(event.target.value as ShipmentCarrier)
              }
              className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-slate-400"
            >
              {Object.entries(SHIPMENT_CARRIER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-500">
            Loading eligible orders...
          </p>
        ) : eligibleOrders.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-700">
              No eligible paid orders.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Paid orders will appear here when they are ready for shipment
              creation.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr_auto] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Order</span>
              <span>Customer</span>
              <span>Total</span>
              <span>Destination</span>
              <span>Paid</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {eligibleOrders.map((order) => {
                const isCreating = creatingOrderId === order.id;
                const availableSellers = order.eligible_sellers ?? [];
                const needsChoice = availableSellers.length > 1;
                const sellerChosen =
                  !needsChoice || Boolean(selectedSeller[order.id]);

                return (
                  <div
                    key={order.id}
                    className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr_auto] md:items-center"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {order.order_number}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Order ID: {order.id}
                      </p>
                      {needsChoice ? (
                        <label className="mt-3 block text-xs font-medium text-slate-700">
                          Seller for {order.order_number}
                          <select
                            value={selectedSeller[order.id] ?? ""}
                            disabled={creatingOrderId !== null}
                            onChange={(event) =>
                              setSelectedSeller((previous) => ({
                                ...previous,
                                [order.id]: event.target.value,
                              }))
                            }
                            className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"
                          >
                            <option value="">Select seller</option>
                            {availableSellers.map((seller) => (
                              <option key={seller.id} value={seller.id}>
                                {seller.name} ({seller.status})
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : availableSellers.length === 1 ? (
                        <p className="mt-2 text-xs text-slate-600">
                          Seller: {availableSellers[0].name}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {order.user_full_name || order.receiver_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {order.user_email}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-950">
                        {formatMoney(order.total_amount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Shipping {formatMoney(order.shipping_cost)}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600">
                      {order.city}, {order.province}
                    </p>

                    <p className="text-sm text-slate-600">
                      {formatDate(order.paid_at)}
                    </p>

                    <button
                      type="button"
                      disabled={creatingOrderId !== null || !sellerChosen}
                      onClick={() => void handleCreateShipment(order)}
                      className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCreating
                        ? "Creating..."
                        : `Create ${getShipmentCarrierLabel(carrier)}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Shipments</h2>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | ShipmentStatus)
            }
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {getShipmentStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-500">Loading shipments...</p>
        ) : filteredShipments.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No shipments found.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Shipment</span>
              <span>Order</span>
              <span>Status</span>
              <span>Carrier</span>
              <span>Created</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {filteredShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] md:items-center"
                >
                  <div>
                    <Link
                      href={`/admin/shipments/${shipment.id}`}
                      className="font-semibold text-slate-950 hover:underline"
                    >
                      {shipment.shipment_number}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {shipment.user_email}
                    </p>
                  </div>

                  <div className="text-sm text-slate-600">
                    <p>{shipment.order_number}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {shipment.seller_name ?? "Legacy order shipment"}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {shipment.status_display ||
                      getShipmentStatusLabel(shipment.status)}
                  </span>

                  <div>
                    <p className="text-sm text-slate-600">
                      {shipment.carrier_display ||
                        getShipmentCarrierLabel(shipment.carrier)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatMoney(shipment.shipping_cost)}
                    </p>
                  </div>

                  <p className="text-sm text-slate-600">
                    {formatDate(shipment.created_at)}
                  </p>

                  <Link
                    href={`/admin/shipments/${shipment.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Manage
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
