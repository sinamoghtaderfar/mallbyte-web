"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuthStore } from "@/features/auth/auth-store";
import {
  approveStockTransfer,
  cancelStockTransfer,
  getMyWarehouseIds,
  getStockTransfers,
  receiveStockTransfer,
  shipStockTransfer,
  type StockListItem,
  type StockTransferDetail,
  type StockTransferListItem,
  type WarehouseListItem,
} from "@/features/inventory/api";
import { StockTransferModal } from "@/features/inventory/components/stock-transfer-modal";
import { getTransferActions } from "@/features/inventory/transfer-actions";
import { getMyPermissions } from "@/features/rbac/api";
import { getApiErrorMessage } from "@/lib/api/errors";

type StockTransfersPanelProps = {
  stocks: StockListItem[];
  warehouses: WarehouseListItem[];
  onInventoryChanged: () => Promise<void>;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

const statusClasses: Record<StockTransferListItem["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-violet-100 text-violet-700",
  in_transit: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function StockTransfersPanel({
  stocks,
  warehouses,
  onInventoryChanged,
}: StockTransfersPanelProps) {
  const user = useAuthStore((state) => state.user);
  const [transfers, setTransfers] = useState<StockTransferListItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [warehouseIds, setWarehouseIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shippingTransfer, setShippingTransfer] =
    useState<StockTransferListItem | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  const isSuperuser = Boolean(user?.is_superuser);
  const userId = user?.id;
  const canCreateTransfers =
    isSuperuser || permissions.includes("create_stock_transfers");
  const canShipOrReceive =
    isSuperuser ||
    permissions.includes("ship_stock_transfers") ||
    permissions.includes("receive_stock_transfers");

  async function loadTransfers() {
    try {
      const data = await getStockTransfers();
      setTransfers(data);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    }
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setPermissions([]);
    setWarehouseIds([]);
    setTransfers([]);
    setError("");

    async function load() {
      try {
        const [transferData, permissionData] = await Promise.all([
          getStockTransfers(),
          getMyPermissions(),
        ]);
        if (cancelled) return;
        setTransfers(transferData);
        setPermissions(permissionData.permissions);

        const needsAssignments =
          permissionData.permissions.includes("ship_stock_transfers") ||
          permissionData.permissions.includes("receive_stock_transfers");

        if (needsAssignments && !isSuperuser) {
          try {
            const ids = await getMyWarehouseIds();
            if (!cancelled) setWarehouseIds(ids);
          } catch (caughtError) {
            // Fail closed: never show warehouse operation buttons if membership
            // cannot be verified. The backend independently enforces access.
            if (!cancelled) {
              setWarehouseIds([]);
              setError(
                `Warehouse assignments could not be loaded: ${getApiErrorMessage(caughtError)}`,
              );
            }
          }
        }
      } catch (caughtError) {
        if (!cancelled) setError(getApiErrorMessage(caughtError));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, isSuperuser]);

  async function handleCreated(transfer: StockTransferDetail) {
    setShowCreateModal(false);
    setMessage(`Transfer #${transfer.id} is waiting for approval.`);
    await loadTransfers();
  }

  async function handleApprove(transfer: StockTransferListItem) {
    if (
      !window.confirm(
        `Approve transfer #${transfer.id} for ${transfer.quantity} units?`,
      )
    ) {
      return;
    }
    try {
      setActionId(transfer.id);
      setError("");
      setMessage("");
      await approveStockTransfer(transfer.id);
      setMessage(`Transfer #${transfer.id} approved.`);
      await loadTransfers();
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(transfer: StockTransferListItem) {
    if (!window.confirm(`Cancel transfer #${transfer.id}?`)) return;
    try {
      setActionId(transfer.id);
      setError("");
      setMessage("");
      await cancelStockTransfer(transfer.id);
      setMessage(`Transfer #${transfer.id} cancelled.`);
      await loadTransfers();
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setActionId(null);
    }
  }

  async function handleShip() {
    if (!shippingTransfer) return;
    const transfer = shippingTransfer;
    if (
      !window.confirm(
        `Ship ${transfer.quantity} units from ${transfer.from_warehouse_name}? ` +
          "This immediately deducts stock from the source warehouse.",
      )
    )
      return;

    try {
      setActionId(transfer.id);
      setError("");
      setMessage("");
      await shipStockTransfer(transfer.id, trackingNumber);
      setShippingTransfer(null);
      setTrackingNumber("");
      setMessage(`Transfer #${transfer.id} shipped. Stock is now in transit.`);
      await Promise.all([loadTransfers(), onInventoryChanged()]);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setActionId(null);
    }
  }

  async function handleReceive(transfer: StockTransferListItem) {
    if (
      !window.confirm(
        `Confirm receipt of ${transfer.quantity} units at ${transfer.to_warehouse_name}? ` +
          "This adds stock to the destination warehouse.",
      )
    )
      return;
    try {
      setActionId(transfer.id);
      setError("");
      setMessage("");
      await receiveStockTransfer(transfer.id);
      setMessage(`Transfer #${transfer.id} received and completed.`);
      await Promise.all([loadTransfers(), onInventoryChanged()]);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setActionId(null);
    }
  }

  const filteredTransfers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transfers.filter((transfer) => {
      const searchable = [
        transfer.product_name,
        transfer.product_sku,
        transfer.from_warehouse_name,
        transfer.to_warehouse_name,
        transfer.tracking_number,
        transfer.requested_by_name,
        transfer.approved_by_name,
        transfer.shipped_by_name,
        transfer.received_by_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (!term || searchable.includes(term)) &&
        (statusFilter === "all" || transfer.status === statusFilter)
      );
    });
  }, [transfers, search, statusFilter]);

  return (
    <>
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Stock transfers
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Managers request transfers, supervisors approve them, source
              warehouses ship, and destination warehouses confirm receipt.
            </p>
          </div>
          {canCreateTransfers && !isLoading ? (
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setShowCreateModal(true);
              }}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
            >
              New transfer
            </button>
          ) : null}
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}
        {message ? (
          <div
            role="status"
            className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {message}
          </div>
        ) : null}
        {canShipOrReceive &&
        !isSuperuser &&
        warehouseIds.length === 0 &&
        !isLoading &&
        !error ? (
          <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            No active warehouse assignment found. Ask an administrator to assign
            your warehouse.
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            type="search"
            aria-label="Search transfers"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product, warehouse, requester..."
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
          />
          <select
            aria-label="Filter transfer status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="in_transit">In transit</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-500">Loading transfers...</p>
        ) : filteredTransfers.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            No stock transfers match these filters.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Route
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Qty
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Requested by
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Approved by
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Shipping / Receiving
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransfers.map((transfer) => {
                  const actions = getTransferActions(transfer, {
                    userId: user?.id ?? null,
                    permissions,
                    warehouseIds,
                    isSuperuser,
                  });
                  const isBusy = actionId === transfer.id;
                  const hasAction =
                    actions.canApprove ||
                    actions.canCancel ||
                    actions.canShip ||
                    actions.canReceive;
                  return (
                    <tr key={transfer.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">
                          {transfer.product_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {transfer.product_sku}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          #{transfer.id}
                        </p>
                        {transfer.reason ? (
                          <p className="mt-2 max-w-[220px] text-xs text-slate-500">
                            {transfer.reason}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <p>{transfer.from_warehouse_name}</p>
                        <p className="my-1 text-xs text-slate-400">↓</p>
                        <p>{transfer.to_warehouse_name}</p>
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {transfer.quantity}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${statusClasses[transfer.status]}`}
                        >
                          {transfer.status_display}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p>{transfer.requested_by_name || "—"}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(transfer.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p>{transfer.approved_by_name || "—"}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {transfer.approved_at
                            ? formatDate(transfer.approved_at)
                            : transfer.status === "pending"
                              ? "Awaiting approval"
                              : transfer.status === "cancelled" &&
                                  !transfer.approved_by
                                ? "Cancelled before approval"
                                : "Approval timestamp unavailable"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        <p>Tracking: {transfer.tracking_number || "—"}</p>
                        <p className="mt-2">
                          Shipped by: {transfer.shipped_by_name || "—"}
                        </p>
                        {transfer.shipped_at ? (
                          <p className="mt-1 text-slate-400">
                            {formatDate(transfer.shipped_at)}
                          </p>
                        ) : null}
                        <p className="mt-2">
                          Received by: {transfer.received_by_name || "—"}
                        </p>
                        {transfer.received_at ? (
                          <p className="mt-1 text-slate-400">
                            {formatDate(transfer.received_at)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[120px] flex-wrap gap-2">
                          {actions.canApprove ? (
                            <button
                              type="button"
                              aria-label={`Approve transfer ${transfer.id}`}
                              disabled={isBusy}
                              onClick={() => void handleApprove(transfer)}
                              className="rounded-xl bg-violet-700 px-3 py-2 text-xs font-medium text-white hover:bg-violet-800 disabled:opacity-50"
                            >
                              Approve
                            </button>
                          ) : null}
                          {actions.canCancel ? (
                            <button
                              type="button"
                              aria-label={`Cancel transfer ${transfer.id}`}
                              disabled={isBusy}
                              onClick={() => void handleCancel(transfer)}
                              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          ) : null}
                          {actions.canShip ? (
                            <button
                              type="button"
                              aria-label={`Ship transfer ${transfer.id}`}
                              disabled={isBusy}
                              onClick={() => {
                                setShippingTransfer(transfer);
                                setTrackingNumber(transfer.tracking_number);
                              }}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              Ship
                            </button>
                          ) : null}
                          {actions.canReceive ? (
                            <button
                              type="button"
                              aria-label={`Receive transfer ${transfer.id}`}
                              disabled={isBusy}
                              onClick={() => void handleReceive(transfer)}
                              className="rounded-xl bg-green-700 px-3 py-2 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                            >
                              Receive
                            </button>
                          ) : null}
                          {!hasAction ? (
                            <span className="text-xs text-slate-400">
                              {transfer.status === "pending"
                                ? "Awaiting independent approval"
                                : transfer.status === "approved"
                                  ? "Awaiting source warehouse"
                                  : transfer.status === "in_transit"
                                    ? "Awaiting destination warehouse"
                                    : "No actions"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreateModal ? (
        <StockTransferModal
          stocks={stocks}
          warehouses={warehouses}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      ) : null}

      {shippingTransfer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ship-transfer-title"
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"
          >
            <h2
              id="ship-transfer-title"
              className="text-xl font-semibold text-slate-950"
            >
              Ship stock transfer
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Transfer #{shippingTransfer.id}:{" "}
              {shippingTransfer.from_warehouse_name} →{" "}
              {shippingTransfer.to_warehouse_name}
            </p>
            <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
              Shipping deducts {shippingTransfer.quantity} units from the source
              warehouse immediately.
            </p>
            <label className="mt-6 block">
              <span className="text-sm font-medium text-slate-700">
                Tracking number (optional)
              </span>
              <input
                type="text"
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                maxLength={100}
                placeholder="Tracking number"
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={actionId === shippingTransfer.id}
                onClick={() => {
                  setShippingTransfer(null);
                  setTrackingNumber("");
                }}
                className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={actionId === shippingTransfer.id}
                onClick={() => void handleShip()}
                className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white disabled:opacity-50"
              >
                {actionId === shippingTransfer.id
                  ? "Shipping..."
                  : "Confirm shipment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
