"use client";

import { AccessibleDialog } from "@/components/ui/accessible-dialog";

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

type StockTransfersPanelContentProps = StockTransfersPanelProps & {
  userId: number | null;
  isSuperuser: boolean;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

const statusClasses: Record<StockTransferListItem["status"], string> = {
  pending: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200",
  approved: "bg-ink text-white ring-1 ring-inset ring-ink",
  in_transit: "bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-200",
  completed: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200",
};

/**
 * Remount the content when the authenticated user changes.
 * This prevents permissions, transfers and open dialogs
 * from carrying over between accounts.
 */
export function StockTransfersPanel(props: StockTransfersPanelProps) {
  const user = useAuthStore((state) => state.user);

  const userId = user?.id ?? null;
  const isSuperuser = Boolean(user?.is_superuser);

  return (
    <StockTransfersPanelContent
      key={`${userId ?? "guest"}:${isSuperuser}`}
      {...props}
      userId={userId}
      isSuperuser={isSuperuser}
    />
  );
}

function StockTransfersPanelContent({
  stocks,
  warehouses,
  onInventoryChanged,
  userId,
  isSuperuser,
}: StockTransfersPanelContentProps) {
  const [transfers, setTransfers] = useState<StockTransferListItem[]>([]);

  const [permissions, setPermissions] = useState<string[]>([]);

  const [warehouseIds, setWarehouseIds] = useState<number[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(userId !== null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [shippingTransfer, setShippingTransfer] =
    useState<StockTransferListItem | null>(null);

  const [trackingNumber, setTrackingNumber] = useState("");

  const [actionId, setActionId] = useState<number | null>(null);

  const canCreateTransfers =
    userId !== null &&
    (isSuperuser || permissions.includes("create_stock_transfers"));

  const canShipOrReceive =
    userId !== null &&
    (isSuperuser ||
      permissions.includes("ship_stock_transfers") ||
      permissions.includes("receive_stock_transfers"));

  async function loadTransfers() {
    try {
      const data = await getStockTransfers();
      setTransfers(data);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    }
  }

  useEffect(() => {
    if (userId === null) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [transferData, permissionData] = await Promise.all([
          getStockTransfers(),
          getMyPermissions(),
        ]);

        if (cancelled) {
          return;
        }

        setTransfers(transferData);
        setPermissions(permissionData.permissions);

        const needsAssignments =
          permissionData.permissions.includes("ship_stock_transfers") ||
          permissionData.permissions.includes("receive_stock_transfers");

        if (needsAssignments && !isSuperuser) {
          try {
            const ids = await getMyWarehouseIds();

            if (!cancelled) {
              setWarehouseIds(ids);
            }
          } catch (caughtError) {
            // Fail closed if warehouse membership cannot
            // be verified. The backend also checks access.
            if (!cancelled) {
              setWarehouseIds([]);

              setError(
                `Warehouse assignments could not be loaded: ${getApiErrorMessage(caughtError)}`,
              );
            }
          }
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
    if (!window.confirm(`Cancel transfer #${transfer.id}?`)) {
      return;
    }

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
    if (!shippingTransfer) {
      return;
    }

    const transfer = shippingTransfer;

    if (
      !window.confirm(
        `Ship ${transfer.quantity} units from ${transfer.from_warehouse_name}? ` +
          "This immediately deducts stock from the source warehouse.",
      )
    ) {
      return;
    }

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
    ) {
      return;
    }

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
      <section className="mb-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Stock transfers
            </h2>

            <p className="mt-1 max-w-2xl text-sm text-muted">
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
              className="mb-btn mb-btn-primary"
            >
              New transfer
            </button>
          ) : null}
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
          >
            {error}
          </div>
        ) : null}

        {message ? (
          <div
            role="status"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
          >
            {message}
          </div>
        ) : null}

        {canShipOrReceive &&
        !isSuperuser &&
        warehouseIds.length === 0 &&
        !isLoading &&
        !error ? (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
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
            className="mb-control"
          />

          <select
            aria-label="Filter transfer status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mb-control mb-select"
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
          <p role="status" className="mt-6 text-sm text-muted">Loading transfers...</p>
        ) : filteredTransfers.length === 0 ? (
          <p className="mt-6 rounded-xl border border-line bg-sunken/60 p-5 text-sm text-slate-600">
            No stock transfers match these filters.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-line">
            <table className="mb-table min-w-[64rem]">
              <thead>
                <tr>
                  <th scope="col">
                    Product
                  </th>

                  <th scope="col">
                    Route
                  </th>

                  <th scope="col">
                    Qty
                  </th>

                  <th scope="col">
                    Status
                  </th>

                  <th scope="col">
                    Requested by
                  </th>

                  <th scope="col">
                    Approved by
                  </th>

                  <th scope="col">
                    Shipping / Receiving
                  </th>

                  <th scope="col">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTransfers.map((transfer) => {
                  const actions = getTransferActions(transfer, {
                    userId,
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
                    <tr key={transfer.id} className="[&>td]:align-top">
                      <td>
                        <p className="font-semibold text-foreground">
                          {transfer.product_name}
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          {transfer.product_sku}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          #{transfer.id}
                        </p>

                        {transfer.reason ? (
                          <p className="mt-2 max-w-[220px] text-xs text-muted">
                            {transfer.reason}
                          </p>
                        ) : null}
                      </td>

                      <td className="text-slate-700">
                        <p>{transfer.from_warehouse_name}</p>

                        <p className="my-1 text-xs text-slate-500">↓</p>

                        <p>{transfer.to_warehouse_name}</p>
                      </td>

                      <td className="font-semibold">
                        {transfer.quantity}
                      </td>

                      <td>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 ${statusClasses[transfer.status]}`}
                        >
                          {transfer.status_display}
                        </span>
                      </td>

                      <td>
                        <p>{transfer.requested_by_name || "—"}</p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(transfer.created_at)}
                        </p>
                      </td>

                      <td>
                        <p>{transfer.approved_by_name || "—"}</p>

                        <p className="mt-1 text-xs text-slate-500">
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

                      <td className="text-xs text-slate-600">
                        <p>Tracking: {transfer.tracking_number || "—"}</p>

                        <p className="mt-2">
                          Shipped by: {transfer.shipped_by_name || "—"}
                        </p>

                        {transfer.shipped_at ? (
                          <p className="mt-1 text-slate-500">
                            {formatDate(transfer.shipped_at)}
                          </p>
                        ) : null}

                        <p className="mt-2">
                          Received by: {transfer.received_by_name || "—"}
                        </p>

                        {transfer.received_at ? (
                          <p className="mt-1 text-slate-500">
                            {formatDate(transfer.received_at)}
                          </p>
                        ) : null}
                      </td>

                      <td>
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
                              className="mb-btn mb-btn-secondary text-rose-700 hover:bg-rose-50 mb-btn-sm"
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
                              className="mb-btn mb-btn-primary mb-btn-sm"
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
                            <span className="text-xs text-slate-500">
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

      {showCreateModal && canCreateTransfers ? (
        <StockTransferModal
          stocks={stocks}
          warehouses={warehouses}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      ) : null}

      {shippingTransfer ? (
        <AccessibleDialog
          onClose={() => { setShippingTransfer(null); setTrackingNumber(""); }}
          dismissible={actionId !== shippingTransfer.id}
          labelledBy="ship-transfer-title"
          overlayClassName="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 backdrop-blur-[2px] sm:items-center sm:p-6"
          className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"
        >
            <h2
              id="ship-transfer-title"
              className="text-xl font-semibold text-foreground"
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
                className="mt-2 w-full mb-control"
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
                className="h-11 rounded-xl border border-line px-5 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Back
              </button>

              <button
                type="button"
                disabled={actionId === shippingTransfer.id}
                onClick={() => void handleShip()}
                className="mb-btn mb-btn-primary"
              >
                {actionId === shippingTransfer.id
                  ? "Shipping..."
                  : "Confirm shipment"}
              </button>
            </div>
        </AccessibleDialog>
      ) : null}
    </>
  );
}
