"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { getOrder } from "@/features/orders/api";
import type { OrderDetail } from "@/features/orders/types";
import { getReturnAvailability } from "../eligibility";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { controlStyles } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

import { createReturnRequest } from "../api";
import type { ReturnItemCondition, ReturnReason } from "../types";

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

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<Record<number, ItemFormState>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const selectedItems = useMemo(() => {
    return Object.entries(items)
      .filter(([, item]) => item.enabled && item.maxQuantity > 0)
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

        const data = await getOrder(params.id);
        const available = await getReturnAvailability(data);

        if (!isMounted) return;

        setOrder(data);
        setItems(
          data.items.reduce<Record<number, ItemFormState>>((acc, item) => {
            acc[item.id] = {
              enabled: false,
              quantity: 1,
              maxQuantity: available[item.id] ?? 0,
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
      <div className="grid gap-6" aria-busy="true">
        <p role="status" className="sr-only">Loading return form...</p>
        <Skeleton className="h-20 max-w-md" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <Notice tone="danger" title="We couldn't load the return form">{error}</Notice>
    );
  }

  if (!order) {
    return (
      <EmptyState title="Order not found." action={<Link href="/orders" className={buttonStyles({ variant: "secondary" })}>View your orders</Link>} />
    );
  }

  if (!Object.values(items).some((item) => item.maxQuantity > 0)) {
    return (
      <section className="grid max-w-2xl gap-4">
        <h1>This order is not returnable yet</h1>
        <Notice tone="warning">No delivered items with remaining returnable quantity were found.</Notice>
        <div><Link href={`/orders/${order.id}`} className={buttonStyles({ variant: "secondary" })}>Back to order</Link></div>
      </section>
    );
  }

  const chosenItems = order.items.filter((item) => items[item.id]?.enabled);
  const chosenUnits = chosenItems.reduce((total, item) => total + (items[item.id]?.quantity ?? 0), 0);

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <PageHeader eyebrow="Return request" title="Request a return"
        description={<>Order <span className="font-mono text-foreground">{order.order_number}</span> · choose the items to send back and tell us why.</>}
        crumbs={[{ href: "/orders", label: "Orders" }, { href: `/orders/${order.id}`, label: "Order details" }, { label: "Return" }]} />

      {formError ? <Notice tone="danger">{formError}</Notice> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader eyebrow="Step 1" title="Select items" description="Only delivered items with a returnable quantity can be selected." />
          <ul className="mt-5 grid gap-3">
            {order.items.map((item) => {
              const itemState = items[item.id];
              const returnable = Boolean(itemState?.maxQuantity);
              const enabled = itemState?.enabled ?? false;
              return (
                <li key={item.id} className={`rounded-xl border transition-colors ${enabled ? "border-ink/25 bg-surface ring-1 ring-ink/10" : returnable ? "border-line" : "border-line bg-sunken/50"}`}>
                  <label className={`flex items-start gap-3 p-4 ${returnable ? "cursor-pointer" : "cursor-not-allowed"}`}>
                    <input type="checkbox" checked={enabled} disabled={!returnable}
                      onChange={(event) => updateItem(item.id, { enabled: event.target.checked })}
                      className="mt-1 size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{item.product_name}</span>
                      <span className="mt-0.5 block text-xs text-muted"><span className="font-mono">SKU: {item.product_sku}</span> · Ordered quantity: {item.quantity}</span>
                      <span className={`mt-1.5 block text-xs ${returnable ? "text-success" : "text-muted"}`}>
                        {itemState?.maxQuantity ? `${itemState.maxQuantity} returnable` : "Not yet delivered or no returnable quantity left"}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-foreground" data-numeric>{formatMoney(item.total_price)}</span>
                  </label>

                  {itemState?.enabled ? (
                    <div className="grid gap-4 border-t border-line bg-sunken/40 p-4 md:grid-cols-2">
                      {itemState.maxQuantity > 1 ? (
                        <label className="grid gap-1.5 text-sm">
                          <span className="font-medium text-foreground">Quantity</span>
                          <input type="number" inputMode="numeric" min={1} max={itemState.maxQuantity} value={itemState.quantity}
                            onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} className={controlStyles} />
                          <span className="text-xs text-muted">Max: {itemState.maxQuantity}</span>
                        </label>
                      ) : (
                        <div className="grid gap-1.5 text-sm">
                          <span className="font-medium text-foreground">Quantity</span>
                          <p className="flex min-h-11 items-center rounded-xl border border-line bg-surface px-3.5 text-slate-700">1 item will be returned.</p>
                        </div>
                      )}
                      <label className="grid gap-1.5 text-sm">
                        <span className="font-medium text-foreground">Item condition</span>
                        <select value={itemState.condition} className={`${controlStyles} mb-select pr-10`}
                          onChange={(event) => updateItem(item.id, { condition: event.target.value as ReturnItemCondition })}>
                          {conditionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-sm md:col-span-2">
                        <span className="font-medium text-foreground">Why are you returning this item?</span>
                        <select value={itemState.reason} className={`${controlStyles} mb-select pr-10`}
                          onChange={(event) => updateItem(item.id, { reason: event.target.value as ReturnReason })}>
                          {reasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-sm md:col-span-2">
                        <span className="font-medium text-foreground">Describe the issue</span>
                        <textarea value={itemState.customer_note} rows={3} className={`${controlStyles} min-h-24 resize-y`}
                          onChange={(event) => updateItem(item.id, { customer_note: event.target.value })}
                          placeholder="Example: The item arrived damaged, is missing parts, or does not work as expected." />
                      </label>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>

        <aside className="lg:sticky lg:top-24">
          <Card>
            <CardHeader eyebrow="Step 2" title="Return details" />
            <p className="mt-4 text-sm text-foreground" aria-live="polite" data-numeric>
              {chosenItems.length
                ? `${chosenItems.length} product${chosenItems.length === 1 ? "" : "s"} selected · ${chosenUnits} unit${chosenUnits === 1 ? "" : "s"}`
                : "No items selected yet."}
            </p>
            <div className="mt-4 rounded-xl border border-line bg-sunken/60 p-4 text-sm text-slate-700">
              <p className="font-medium text-foreground">Refund review</p>
              <p className="mt-1 leading-6">
                MallByte support will review this request. If it is approved,
                the refund will be sent back to the original payment method.
              </p>
            </div>
            <Button type="submit" className="mt-5 w-full" loading={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit return request"}
            </Button>
            <Link href={`/orders/${order.id}`} className={buttonStyles({ variant: "quiet", className: "mt-2 w-full" })}>Back to order</Link>
          </Card>
        </aside>
      </div>
    </form>
  );
}
