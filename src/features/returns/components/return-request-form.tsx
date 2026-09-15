"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { getOrder } from "@/features/orders/api";
import { getApiErrorMessage } from "@/lib/api/errors";

import { createReturnRequest } from "../api";
import type { ReturnItemCondition, ReturnReason } from "../types";

type ReturnableOrderItem = {
  id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  total_price: string;
};

type ReturnableOrder = {
  id: number;
  order_number: string;
  status: string;
  items: ReturnableOrderItem[];
};

type ItemFormState = {
  enabled: boolean;
  quantity: number;
  maxQuantity: number;
  reason: ReturnReason;
  condition: ReturnItemCondition;
  customer_note: string;
};

const reasonOptions: Array<{ value: ReturnReason; label: string }> = [
  { value: "damaged", label: "Damaged item" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "defective", label: "Defective" },
  { value: "not_as_described", label: "Not as described" },
  { value: "size_or_fit", label: "Size or fit issue" },
  { value: "changed_mind", label: "Changed mind" },
  { value: "late_delivery", label: "Late delivery" },
  { value: "other", label: "Other" },
];

const conditionOptions: Array<{ value: ReturnItemCondition; label: string }> = [
  { value: "new", label: "New" },
  { value: "opened", label: "Opened" },
  { value: "used", label: "Used" },
  { value: "damaged", label: "Damaged" },
  { value: "unknown", label: "Unknown" },
];

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function clampQuantity(value: number, maxQuantity: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(value), 1), maxQuantity);
}

export function ReturnRequestForm() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<ReturnableOrder | null>(null);
  const [items, setItems] = useState<Record<number, ItemFormState>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const selectedItems = useMemo(() => {
    return Object.entries(items)
      .filter(([, item]) => item.enabled)
      .map(([orderItemId, item]) => ({
        order_item: Number(orderItemId),
        quantity: clampQuantity(item.quantity, item.maxQuantity),
        reason: item.reason,
        condition: item.condition,
        customer_note: item.customer_note,
      }));
  }, [items]);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      try {
        setIsLoading(true);
        setError("");

        const data = (await getOrder(params.id)) as ReturnableOrder;

        if (!isMounted) return;

        setOrder(data);
        setItems(
          data.items.reduce<Record<number, ItemFormState>>((acc, item) => {
            acc[item.id] = {
              enabled: false,
              quantity: 1,
              maxQuantity: item.quantity,
              reason: "other",
              condition: "unknown",
              customer_note: "",
            };

            return acc;
          }, {}),
        );
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  function updateItem(orderItemId: number, updates: Partial<ItemFormState>) {
    setItems((current) => {
      const currentItem = current[orderItemId];

      if (!currentItem) {
        return current;
      }

      const nextItem = {
        ...currentItem,
        ...updates,
      };

      if (typeof updates.quantity === "number") {
        nextItem.quantity = clampQuantity(
          updates.quantity,
          currentItem.maxQuantity,
        );
      }

      return {
        ...current,
        [orderItemId]: nextItem,
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order) return;

    if (selectedItems.length === 0) {
      setFormError("Select at least one item to return.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError("");

      const returnRequest = await createReturnRequest({
        order: order.id,
        reason: selectedItems[0]!.reason,
        requested_resolution: "refund",
        refund_method: "original_payment",
        customer_note: "",
        items: selectedItems,
      });

      router.push(`/returns/${returnRequest.id}`);
    } catch (submitError) {
      setFormError(getApiErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        Loading return form...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        Order not found.
      </div>
    );
  }

  if (order.status !== "delivered") {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-2xl font-bold text-amber-950">
          This order is not returnable yet
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Only delivered orders can be returned.
        </p>
        <Link
          href={`/orders/${order.id}`}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-amber-900 px-5 text-sm font-medium text-white"
        >
          Back to order
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Link
          href={`/orders/${order.id}`}
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to order
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Return request
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Request a return
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Order {order.order_number}
        </p>
      </div>

      {formError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Select items</h2>

          <div className="mt-4 divide-y divide-slate-100">
            {order.items.map((item) => {
              const itemState = items[item.id];

              return (
                <div key={item.id} className="space-y-4 py-5">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={itemState?.enabled ?? false}
                      onChange={(event) =>
                        updateItem(item.id, { enabled: event.target.checked })
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                    />

                    <span className="flex-1">
                      <span className="block font-medium text-slate-950">
                        {item.product_name}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        SKU: {item.product_sku}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Ordered quantity: {item.quantity}
                      </span>
                    </span>

                    <span className="text-sm font-semibold text-slate-950">
                      {formatMoney(item.total_price)}
                    </span>
                  </label>

                  {itemState?.enabled ? (
                    <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
                      {itemState.maxQuantity > 1 ? (
                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-slate-700">
                            Quantity
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={itemState.maxQuantity}
                            value={itemState.quantity}
                            onChange={(event) =>
                              updateItem(item.id, {
                                quantity: Number(event.target.value),
                              })
                            }
                            className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-slate-400"
                          />
                          <span className="block text-xs text-slate-500">
                            Max: {itemState.maxQuantity}
                          </span>
                        </label>
                      ) : (
                        <div className="space-y-1 text-sm">
                          <span className="font-medium text-slate-700">
                            Quantity
                          </span>
                          <p className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-slate-600">
                            1 item will be returned.
                          </p>
                        </div>
                      )}

                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">
                          Item condition
                        </span>
                        <select
                          value={itemState.condition}
                          onChange={(event) =>
                            updateItem(item.id, {
                              condition: event.target
                                .value as ReturnItemCondition,
                            })
                          }
                          className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-slate-400"
                        >
                          {conditionOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="font-medium text-slate-700">
                          Why are you returning this item?
                        </span>
                        <select
                          value={itemState.reason}
                          onChange={(event) =>
                            updateItem(item.id, {
                              reason: event.target.value as ReturnReason,
                            })
                          }
                          className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-slate-400"
                        >
                          {reasonOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="font-medium text-slate-700">
                          Describe the issue
                        </span>
                        <textarea
                          value={itemState.customer_note}
                          onChange={(event) =>
                            updateItem(item.id, {
                              customer_note: event.target.value,
                            })
                          }
                          rows={3}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                          placeholder="Example: The item arrived damaged, is missing parts, or does not work as expected."
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Return details
            </h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Refund review</p>
              <p className="mt-1">
                MallByte support will review this request. If it is approved,
                the refund will be sent back to the original payment method.
              </p>
            </div>

            <div className="mt-4 space-y-4"></div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit return request"}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
