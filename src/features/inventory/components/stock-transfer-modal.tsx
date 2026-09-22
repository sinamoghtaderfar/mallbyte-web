"use client";

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-transfer-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Inventory
            </p>

            <h2
              id="create-transfer-title"
              className="mt-1 text-2xl font-semibold text-slate-950"
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
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
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
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
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
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Total</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {selectedStock.quantity}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Reserved</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {selectedStock.reserved_quantity}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Available</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
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
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
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
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
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
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? "Creating transfer..." : "Create transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
