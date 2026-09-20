"use client";

import { useEffect, useMemo, useState } from "react";

import {
  cancelStockTransfer,
  completeStockTransfer,
  getStockTransfers,
  markStockTransferInTransit,
  type StockListItem,
  type StockTransferDetail,
  type StockTransferListItem,
  type WarehouseListItem,
} from "@/features/inventory/api";
import { StockTransferModal } from "@/features/inventory/components/stock-transfer-modal";
import { getApiErrorMessage } from "@/lib/api/errors";

type StockTransfersPanelProps = {
  stocks: StockListItem[];
  warehouses: WarehouseListItem[];
  onInventoryChanged: () => Promise<void>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function statusClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700";

    case "in_transit":
      return "bg-blue-100 text-blue-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

export function StockTransfersPanel({
  stocks,
  warehouses,
  onInventoryChanged,
}: StockTransfersPanelProps) {
  const [transfers, setTransfers] = useState<StockTransferListItem[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [trackingTransfer, setTrackingTransfer] =
    useState<StockTransferListItem | null>(null);

  const [trackingNumber, setTrackingNumber] = useState("");

  const [actionId, setActionId] = useState<number | null>(null);

  async function loadTransfers() {
    try {
      setError("");

      const data = await getStockTransfers();

      setTransfers(data);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getStockTransfers();

        if (!cancelled) {
          setTransfers(data);
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

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreated(transfer: StockTransferDetail) {
    setShowCreateModal(false);

    setMessage(`Transfer #${transfer.id} created successfully.`);

    await loadTransfers();
  }

  async function handleMarkInTransit() {
    if (!trackingTransfer) {
      return;
    }

    try {
      setActionId(trackingTransfer.id);
      setError("");

      await markStockTransferInTransit(trackingTransfer.id, trackingNumber);

      setTrackingTransfer(null);
      setTrackingNumber("");

      setMessage(`Transfer #${trackingTransfer.id} is now in transit.`);

      await loadTransfers();
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setActionId(null);
    }
  }

  async function handleComplete(transfer: StockTransferListItem) {
    const confirmed = window.confirm(
      `Complete transfer #${transfer.id}? This will move ${transfer.quantity} units from ${transfer.from_warehouse_name} to ${transfer.to_warehouse_name}.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(transfer.id);
      setError("");

      await completeStockTransfer(transfer.id);

      setMessage(`Transfer #${transfer.id} completed.`);

      await Promise.all([loadTransfers(), onInventoryChanged()]);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(transfer: StockTransferListItem) {
    const confirmed = window.confirm(`Cancel transfer #${transfer.id}?`);

    if (!confirmed) {
      return;
    }

    try {
      setActionId(transfer.id);
      setError("");

      await cancelStockTransfer(transfer.id);

      setMessage(`Transfer #${transfer.id} cancelled.`);

      await loadTransfers();
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setActionId(null);
    }
  }

  const filteredTransfers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transfers.filter((transfer) => {
      const matchesSearch =
        !normalizedSearch ||
        transfer.product_name.toLowerCase().includes(normalizedSearch) ||
        transfer.product_sku.toLowerCase().includes(normalizedSearch) ||
        transfer.from_warehouse_name.toLowerCase().includes(normalizedSearch) ||
        transfer.to_warehouse_name.toLowerCase().includes(normalizedSearch) ||
        transfer.tracking_number.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || transfer.status === statusFilter;

      return matchesSearch && matchesStatus;
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

            <p className="mt-1 text-sm text-slate-500">
              Move inventory between warehouses and track transfer progress.
            </p>
          </div>

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
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product, warehouse, tracking..."
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In transit</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-500">Loading transfers...</p>
        ) : filteredTransfers.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-700">
              No stock transfers found.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Create a transfer to move inventory between warehouses.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <div className="min-w-[1250px]">
              <div className="grid grid-cols-[1.5fr_1.5fr_0.6fr_0.9fr_1fr_1fr_auto] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Product</span>
                <span>Route</span>
                <span>Qty</span>
                <span>Status</span>
                <span>Tracking</span>
                <span>Created</span>
                <span>Actions</span>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="grid grid-cols-[1.5fr_1.5fr_0.6fr_0.9fr_1fr_1fr_auto] gap-4 px-4 py-4 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {transfer.product_name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        SKU: {transfer.product_sku}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Transfer #{transfer.id}
                      </p>
                    </div>

                    <div>
                      <p className="font-medium text-slate-800">
                        {transfer.from_warehouse_name}
                      </p>

                      <p className="my-1 text-xs text-slate-400">↓</p>

                      <p className="font-medium text-slate-800">
                        {transfer.to_warehouse_name}
                      </p>
                    </div>

                    <p className="font-semibold text-slate-950">
                      {transfer.quantity}
                    </p>

                    <div>
                      <span
                        className={`inline-flex h-fit rounded-full px-3 py-1 text-xs font-medium ${statusClass(
                          transfer.status,
                        )}`}
                      >
                        {transfer.status_display}
                      </span>
                    </div>

                    <p className="text-slate-600">
                      {transfer.tracking_number || "—"}
                    </p>

                    <div>
                      <p className="text-slate-600">
                        {formatDate(transfer.created_at)}
                      </p>

                      {transfer.reason ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {transfer.reason}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-start gap-2">
                      {transfer.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            disabled={actionId === transfer.id}
                            onClick={() => {
                              setTrackingTransfer(transfer);
                              setTrackingNumber(transfer.tracking_number);
                            }}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            Ship
                          </button>

                          <button
                            type="button"
                            disabled={actionId === transfer.id}
                            onClick={() => void handleCancel(transfer)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}

                      {transfer.status === "in_transit" ? (
                        <>
                          <button
                            type="button"
                            disabled={actionId === transfer.id}
                            onClick={() => void handleComplete(transfer)}
                            className="rounded-xl bg-green-700 px-3 py-2 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                          >
                            Complete
                          </button>

                          <button
                            type="button"
                            disabled={actionId === transfer.id}
                            onClick={() => void handleCancel(transfer)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}

                      {transfer.status === "completed" ||
                      transfer.status === "cancelled" ? (
                        <span className="text-xs text-slate-400">
                          No actions
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

      {trackingTransfer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-950">
              Mark transfer in transit
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Transfer #{trackingTransfer.id}:{" "}
              {trackingTransfer.from_warehouse_name}
              {" → "}
              {trackingTransfer.to_warehouse_name}
            </p>

            <label className="mt-6 block">
              <span className="text-sm font-medium text-slate-700">
                Tracking number
              </span>

              <input
                type="text"
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                placeholder="Optional tracking number"
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setTrackingTransfer(null);
                  setTrackingNumber("");
                }}
                disabled={actionId === trackingTransfer.id}
                className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleMarkInTransit()}
                disabled={actionId === trackingTransfer.id}
                className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white disabled:opacity-50"
              >
                {actionId === trackingTransfer.id
                  ? "Updating..."
                  : "Mark in transit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
