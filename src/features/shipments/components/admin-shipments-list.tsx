"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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
import { Clock3, PackageCheck, Route, Truck } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getSessionGeneration, isCurrentSession } from "@/lib/auth/session-storage";
import type { PaginatedResponse } from "@/types/api";

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
  const [eligiblePagination, setEligiblePagination] = useState<PaginatedResponse<EligibleShipmentOrder> | null>(null);
  const eligibleOrders = eligiblePagination?.results ?? [];
  const [eligibleQuery, setEligibleQuery] = useState({ page: 1, revision: 0 });
  const [eligibleLoading, setEligibleLoading] = useState(true);
  const [eligibleError, setEligibleError] = useState("");
  const eligibleRequest = useRef(0);
  const mounted = useRef(false);

  function refreshEligible(page: number) {
    eligibleRequest.current += 1;
    setEligibleLoading(true);
    setEligibleError("");
    setEligibleQuery((current) => ({ page, revision: current.revision + 1 }));
  }

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const request = ++eligibleRequest.current;
    const session = getSessionGeneration();
    const controller = new AbortController();
    const current = () => mounted.current && request === eligibleRequest.current && isCurrentSession(session);
    async function load() {
      setEligibleLoading(true);
      setEligibleError("");
      try {
        const data = await getEligibleShipmentOrders(eligibleQuery.page, controller.signal);
        if (current()) setEligiblePagination(data);
      } catch (reason) {
        if (current()) setEligibleError(getApiErrorMessage(reason));
      } finally {
        if (current()) setEligibleLoading(false);
      }
    }
    void load();
    return () => { eligibleRequest.current += 1; controller.abort(); };
  }, [eligibleQuery]);
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

      const shipmentData = await getShipments();
      if (mounted.current) setShipments(shipmentData);
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
        const shipmentData = await getShipments();
        if (cancelled) return;
        setShipments(shipmentData);
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

    const session = getSessionGeneration();
    const current = () => mounted.current && isCurrentSession(session);
    try {
      setCreatingOrderId(order.id);
      setError("");
      setMessage("");

      const shipment = await createShipment({
        order: order.id,
        carrier,
        ...(sellerId ? { seller: sellerId } : {}),
      });

      if (!current()) return;
      setMessage(
        `Shipment ${shipment.shipment_number} created for order ${order.order_number}${shipment.seller_name ? ` (${shipment.seller_name})` : ""}.`,
      );

      refreshEligible(1);
      await loadShippingData();
      if (!current()) return;
      setSelectedSeller((previous) => ({ ...previous, [order.id]: "" }));
    } catch (caughtError) {
      if (current()) setError(getApiErrorMessage(caughtError));
    } finally {
      if (current()) setCreatingOrderId(null);
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
    <main className="grid gap-6">
      <PageHeader eyebrow="Admin" title="Shipping management"
        description="Create shipments for paid orders and manage shipment progress from preparation to delivery."
        actions={<Link href="/admin" className={buttonStyles({ variant: "secondary" })}>Admin dashboard</Link>} />

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}

      <section aria-label="Shipment summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total shipments" value={shipments.length} icon={<Truck size={16} />} />
        <StatCard label="Pending" value={pendingCount} icon={<Clock3 size={16} />} tone={pendingCount ? "brand" : "default"} />
        <StatCard label="In transit" value={inTransitCount} icon={<Route size={16} />} />
        <StatCard label="Delivered" value={deliveredCount} icon={<PackageCheck size={16} />} />
      </section>

      <Card padded={false} className="overflow-hidden">
        <div className="grid gap-4 p-5 sm:p-6">
          <CardHeader title="Eligible paid orders"
            description="Create a separate shipment for each eligible seller. Orders remain here while another seller still needs a shipment."
            action={<label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">Carrier</span>
              <select value={carrier} onChange={(event) => setCarrier(event.target.value as ShipmentCarrier)} className="mb-control mb-select w-40">
                {Object.entries(SHIPMENT_CARRIER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>} />
        </div>

        {eligibleLoading ? (
          <div role="status" className="grid gap-2 border-t border-line p-5">
            <span className="sr-only">Loading eligible orders...</span>
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : eligibleError ? (
          <div className="border-t border-line p-5">
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
              <p>{eligibleError}</p>
              <Button size="small" variant="secondary" onClick={() => refreshEligible(eligibleQuery.page)}>Retry eligible orders</Button>
            </div>
          </div>
        ) : eligibleOrders.length === 0 ? (
          <div className="border-t border-line px-5 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No eligible paid orders.</p>
            <p className="mt-1 text-xs text-muted">Paid orders will appear here when they are ready for shipment creation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="mb-table min-w-[58rem]">
              <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col" className="text-right">Total</th><th scope="col">Destination</th><th scope="col">Paid</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                {eligibleOrders.map((order) => {
                  const isCreating = creatingOrderId === order.id;
                  const availableSellers = order.eligible_sellers ?? [];
                  const needsChoice = availableSellers.length > 1;
                  const sellerChosen = !needsChoice || Boolean(selectedSeller[order.id]);
                  return (
                    <tr key={order.id} className="[&>td]:align-top">
                      <td>
                        <p className="font-mono text-[0.8125rem] font-semibold text-foreground">{order.order_number}</p>
                        <p className="mt-0.5 text-xs text-muted">Order ID: {order.id}</p>
                        {needsChoice ? (
                          <label className="mt-2.5 block text-xs font-medium text-slate-700">
                            Seller for {order.order_number}
                            <select value={selectedSeller[order.id] ?? ""} disabled={creatingOrderId !== null}
                              onChange={(event) => setSelectedSeller((previous) => ({ ...previous, [order.id]: event.target.value }))}
                              className="mb-control mb-select mt-1 w-56">
                              <option value="">Select seller</option>
                              {availableSellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name} ({seller.status})</option>)}
                            </select>
                          </label>
                        ) : availableSellers.length === 1 ? (
                          <p className="mt-1.5 text-xs text-slate-700">Seller: {availableSellers[0].name}</p>
                        ) : null}
                      </td>
                      <td>
                        <p className="font-medium text-slate-800">{order.user_full_name || order.receiver_name}</p>
                        <p className="mt-0.5 text-xs text-muted">{order.user_email}</p>
                      </td>
                      <td className="text-right">
                        <p className="font-medium text-foreground">{formatMoney(order.total_amount)}</p>
                        <p className="mt-0.5 text-xs text-muted">Shipping {formatMoney(order.shipping_cost)}</p>
                      </td>
                      <td className="text-slate-700">{order.city}, {order.province}</td>
                      <td className="whitespace-nowrap text-muted">{formatDate(order.paid_at)}</td>
                      <td className="text-right">
                        <Button size="small" disabled={creatingOrderId !== null || !sellerChosen} loading={isCreating}
                          onClick={() => void handleCreateShipment(order)}>
                          {isCreating ? "Creating..." : `Create ${getShipmentCarrierLabel(carrier)}`}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination className="border-t border-line px-5 py-3" label="Eligible order pages"
          summary={eligiblePagination ? `${eligiblePagination.count} eligible orders · Page ${eligibleQuery.page} of ${Math.max(1, Math.ceil(eligiblePagination.count / 20))}` : "Eligible order pages"}
          canPrevious={eligibleQuery.page > 1 && creatingOrderId === null}
          canNext={Boolean(eligiblePagination?.next) && !eligibleLoading && !eligibleError && creatingOrderId === null}
          previousLabel="Previous eligible orders" nextLabel="Next eligible orders"
          onPrevious={() => refreshEligible(eligibleQuery.page - 1)} onNext={() => refreshEligible(eligibleQuery.page + 1)} />
      </Card>

      <Card padded={false} className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <CardHeader title="Shipments" description="Every shipment created from paid orders, newest first."
            action={<select aria-label="Shipment status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | ShipmentStatus)} className="mb-control mb-select w-44">
              <option value="all">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{getShipmentStatusLabel(status)}</option>)}
            </select>} />
        </div>

        {isLoading ? (
          <div role="status" className="grid gap-2 border-t border-line p-5">
            <span className="sr-only">Loading shipments...</span>
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : filteredShipments.length === 0 ? (
          <p className="border-t border-line px-5 py-10 text-center text-sm text-muted">No shipments found.</p>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="mb-table min-w-[54rem]">
              <thead><tr><th scope="col">Shipment</th><th scope="col">Order</th><th scope="col">Status</th><th scope="col">Carrier</th><th scope="col">Created</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                {filteredShipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td>
                      <Link href={`/admin/shipments/${shipment.id}`} className="font-mono text-[0.8125rem] font-semibold text-foreground underline-offset-4 hover:underline">{shipment.shipment_number}</Link>
                      <p className="mt-0.5 text-xs text-muted">{shipment.user_email}</p>
                    </td>
                    <td>
                      <p className="font-mono text-[0.8125rem] text-slate-700">{shipment.order_number}</p>
                      <p className="mt-0.5 text-xs text-muted">{shipment.seller_name ?? "Legacy order shipment"}</p>
                    </td>
                    <td><StatusBadge status={shipment.status} label={shipment.status_display || getShipmentStatusLabel(shipment.status)} /></td>
                    <td>
                      <p className="text-slate-700">{shipment.carrier_display || getShipmentCarrierLabel(shipment.carrier)}</p>
                      <p className="mt-0.5 text-xs text-muted" data-numeric>{formatMoney(shipment.shipping_cost)}</p>
                    </td>
                    <td className="whitespace-nowrap text-muted">{formatDate(shipment.created_at)}</td>
                    <td className="text-right">
                      <Link href={`/admin/shipments/${shipment.id}`} className={buttonStyles({ variant: "secondary", size: "small" })}>Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
