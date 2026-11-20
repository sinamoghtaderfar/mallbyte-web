"use client";

import { AccessibleDialog } from "@/components/ui/accessible-dialog";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import {
  createStockTransfer,
  type StockListItem,
  type StockTransferDetail,
  type WarehouseListItem,
} from "@/features/inventory/api";
import { getApiErrorMessage } from "@/lib/api/errors";

type StockTransferModalProps = {
  stocks: StockListItem[];
  warehouses: WarehouseListItem[];
  onClose: () => void;
  onCreated: (transfer: StockTransferDetail) => void | Promise<void>;
};

export function StockTransferModal({
  stocks,
  warehouses,
  onClose,
  onCreated,
}: StockTransferModalProps) {
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [stockId, setStockId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceStocks = useMemo(() => {
    if (!fromWarehouse) {
      return [];
    }

    return stocks.filter(
      (stock) =>
        stock.warehouse === Number(fromWarehouse) &&
        stock.available_quantity > 0,
    );
  }, [stocks, fromWarehouse]);

  const selectedStock =
    sourceStocks.find((stock) => stock.id === Number(stockId)) ?? null;

  const destinationWarehouses = warehouses.filter(
    (warehouse) => warehouse.id !== Number(fromWarehouse),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fromWarehouse || !toWarehouse || !selectedStock) {
      setError(
        "Select a source warehouse, product, and destination warehouse.",
      );
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (parsedQuantity > selectedStock.available_quantity) {
      setError(
        `Only ${selectedStock.available_quantity} units are available in the source warehouse.`,
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const transfer = await createStockTransfer({
        from_warehouse: Number(fromWarehouse),
        to_warehouse: Number(toWarehouse),
        product: selectedStock.product,
        quantity: parsedQuantity,
        reason: reason.trim(),
      });

      await onCreated(transfer);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AccessibleDialog
      onClose={onClose}
      dismissible={!isSubmitting}
      labelledBy="create-transfer-title"
      overlayClassName="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 backdrop-blur-[2px] sm:items-center sm:p-6"
      className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-2xl outline-none sm:rounded-3xl sm:p-6"
    >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-eyebrow">
              Inventory
            </p>

            <h2
              id="create-transfer-title"
              className="mt-1 text-2xl font-semibold text-foreground"
            >
              Create stock transfer
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Move product inventory between active warehouses.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="mb-btn mb-btn-secondary mb-btn-sm"
          >
            Close
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Source warehouse
            </span>

            <select
              value={fromWarehouse}
              onChange={(event) => {
                setFromWarehouse(event.target.value);
                setStockId("");
                setToWarehouse("");
              }}
              className="mt-2 w-full mb-control mb-select"
              required
            >
              <option value="">Select source warehouse</option>

              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Product</span>

            <select
              value={stockId}
              onChange={(event) => setStockId(event.target.value)}
              disabled={!fromWarehouse}
              className="mt-2 w-full disabled:bg-slate-50 mb-control mb-select"
              required
            >
              <option value="">Select product</option>

              {sourceStocks.map((stock) => (
                <option key={stock.id} value={stock.id}>
                  {stock.product_name} — {stock.available_quantity} available
                </option>
              ))}
            </select>
          </label>

          {selectedStock ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-sunken/60 p-4">
                <p className="text-xs text-muted">Total</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {selectedStock.quantity}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-sunken/60 p-4">
                <p className="text-xs text-muted">Reserved</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {selectedStock.reserved_quantity}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-sunken/60 p-4">
                <p className="text-xs text-muted">Available</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {selectedStock.available_quantity}
                </p>
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Destination warehouse
            </span>

            <select
              value={toWarehouse}
              onChange={(event) => setToWarehouse(event.target.value)}
              disabled={!fromWarehouse}
              className="mt-2 w-full disabled:bg-slate-50 mb-control mb-select"
              required
            >
              <option value="">Select destination warehouse</option>

              {destinationWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Quantity</span>

            <input
              type="number"
              min="1"
              step="1"
              max={selectedStock?.available_quantity}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-2 w-full mb-control"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Reason</span>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Why is this stock being transferred?"
              className="mt-2 w-full mb-control"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="mb-btn mb-btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mb-btn mb-btn-primary"
            >
              {isSubmitting ? "Creating transfer..." : "Create transfer"}
            </button>
          </div>
        </form>
    </AccessibleDialog>
  );
}
