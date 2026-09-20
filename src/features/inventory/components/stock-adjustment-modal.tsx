"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import {
    createStockMovement,
    type StockListItem,
    type StockMovementDetail,
    type StockMovementType,
} from "@/features/inventory/api";
import { getApiErrorMessage } from "@/lib/api/errors";

type AdjustableMovementType =
  | "purchase"
  | "return"
  | "damaged"
  | "adjustment";

type AdjustmentDirection = "increase" | "decrease";

type StockAdjustmentModalProps = {
  stock: StockListItem;
  onClose: () => void;
  onCreated: (
    movement: StockMovementDetail,
  ) => void | Promise<void>;
};

const MOVEMENT_OPTIONS: Array<{
  value: AdjustableMovementType;
  label: string;
}> = [
  {
    value: "purchase",
    label: "Purchase / stock in",
  },
  {
    value: "return",
    label: "Customer return",
  },
  {
    value: "damaged",
    label: "Damaged goods",
  },
  {
    value: "adjustment",
    label: "Manual adjustment",
  },
];

export function StockAdjustmentModal({
  stock,
  onClose,
  onCreated,
}: StockAdjustmentModalProps) {
  const [movementType, setMovementType] =
    useState<AdjustableMovementType>("purchase");

  const [direction, setDirection] =
    useState<AdjustmentDirection>("increase");

  const [quantity, setQuantity] = useState("1");
  const [referenceId, setReferenceId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const numericQuantity = Number(quantity);

  const signedQuantity = useMemo(() => {
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      return 0;
    }

    if (movementType === "damaged") {
      return -numericQuantity;
    }

    if (
      movementType === "adjustment" &&
      direction === "decrease"
    ) {
      return -numericQuantity;
    }

    return numericQuantity;
  }, [numericQuantity, movementType, direction]);

  const previewQuantity =
    stock.quantity + signedQuantity;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !Number.isInteger(numericQuantity) ||
      numericQuantity <= 0
    ) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a reason for this stock change.");
      return;
    }

    if (
      signedQuantity < 0 &&
      numericQuantity > stock.available_quantity
    ) {
      setError(
        `Only ${stock.available_quantity} units are available to remove. ${stock.reserved_quantity} units are currently reserved.`,
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const movement = await createStockMovement({
        product: stock.product,
        warehouse: stock.warehouse,
        movement_type: movementType as StockMovementType,
        quantity: signedQuantity,
        reference_id: referenceId.trim(),
        reason: reason.trim(),
        notes: notes.trim(),
      });

      await onCreated(movement);
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
        aria-labelledby="stock-adjustment-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Inventory
            </p>

            <h2
              id="stock-adjustment-title"
              className="mt-1 text-2xl font-semibold text-slate-950"
            >
              Adjust stock
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {stock.product_name} · {stock.warehouse_name}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              SKU: {stock.product_sku}
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

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {stock.quantity}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Reserved
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {stock.reserved_quantity}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Available
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {stock.available_quantity}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Movement type
            </span>

            <select
              value={movementType}
              onChange={(event) =>
                setMovementType(
                  event.target.value as AdjustableMovementType,
                )
              }
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
            >
              {MOVEMENT_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {movementType === "adjustment" ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Adjustment direction
              </span>

              <select
                value={direction}
                onChange={(event) =>
                  setDirection(
                    event.target.value as AdjustmentDirection,
                  )
                }
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              >
                <option value="increase">
                  Increase stock
                </option>
                <option value="decrease">
                  Decrease stock
                </option>
              </select>
            </label>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Quantity
            </span>

            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              required
            />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Stock preview
            </p>

            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">
                {stock.quantity}
              </span>

              <span className="text-slate-400">→</span>

              <span className="font-semibold text-slate-950">
                {previewQuantity}
              </span>

              {signedQuantity !== 0 ? (
                <span
                  className={
                    signedQuantity > 0
                      ? "text-green-700"
                      : "text-red-700"
                  }
                >
                  ({signedQuantity > 0 ? "+" : ""}
                  {signedQuantity})
                </span>
              ) : null}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Reference ID
            </span>

            <input
              type="text"
              value={referenceId}
              onChange={(event) =>
                setReferenceId(event.target.value)
              }
              placeholder="Example: PO-2026-001"
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
            />

            <span className="mt-1 block text-xs text-slate-500">
              Optional purchase, return, invoice, or internal reference.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Reason
            </span>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Why is this stock changing?"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Notes
            </span>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional internal notes"
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
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving adjustment..."
                : "Save adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}