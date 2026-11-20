"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PackageCheck, PackageSearch } from "lucide-react";

import { StatusBadge, statusTone } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DetailList, Timeline } from "@/components/ui/data-display";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

import { getSellerOrder, updateSellerOrderStatus } from "../api";

import type {
  SellerOrderDetail as SellerOrderDetailType,
  SellerOrderStatusPayload,
} from "../types";

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getNextStatus(
  status: SellerOrderDetailType["seller_status"],
): SellerOrderStatusPayload["status"] | null {
  return status === "paid" ? "processing" : null;
}

export function SellerOrderDetail() {
  const params = useParams<{ id: string }>();

  const [order, setOrder] = useState<SellerOrderDetailType | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const nextStatus = useMemo(() => {
    if (!order) {
      return null;
    }

    if (order.payment_status !== "paid") {
      return null;
    }

    if (order.status === "cancelled" || order.status === "refunded") {
      return null;
    }

    return getNextStatus(order.seller_status);
  }, [order]);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      try {
        setIsLoading(true);
        setError("");

        const data = await getSellerOrder(params.id);

        if (isMounted) {
          setOrder(data);
        }
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

    void loadOrder();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  async function handleUpdateStatus(
    status: SellerOrderStatusPayload["status"],
  ) {
    try {
      setIsUpdating(true);
      setActionError("");
      setActionMessage("");

      const updatedOrder = await updateSellerOrderStatus(params.id, {
        status,
        note: `Seller changed their fulfillment status to ${status}.`,
      });

      setOrder(updatedOrder);

      setActionMessage("Your fulfillment status was updated.");
    } catch (updateError) {
      setActionError(getApiErrorMessage(updateError));
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-6" aria-busy="true">
        <p role="status" className="sr-only">Loading seller order...</p>
        <Skeleton className="h-24 max-w-lg" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid max-w-2xl gap-4">
        <Notice tone="danger" title="Could not load this order">{error}</Notice>
        <div><Link href="/seller/orders" className={buttonStyles({ variant: "secondary" })}>Back to seller orders</Link></div>
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState icon={<PackageSearch size={24} />} title="Order not found."
        action={<Link href="/seller/orders" className={buttonStyles({ variant: "secondary" })}>Back to seller orders</Link>} />
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader eyebrow="Seller order"
        title={<span className="font-mono text-[1.625rem] tracking-tight sm:text-[1.875rem]">{order.order_number}</span>}
        crumbs={[{ href: "/seller/orders", label: "Seller orders" }, { label: "Order details" }]}
        description={order.seller_status === "processing"
          ? "Your items are in preparation. The shipping team will update shipped and delivered statuses when your shipment is processed."
          : undefined}
        actions={nextStatus ? (
          <Button onClick={() => handleUpdateStatus(nextStatus)} loading={isUpdating}>
            {!isUpdating && <PackageCheck size={16} aria-hidden="true" />}{isUpdating ? "Updating..." : "Mark as processing"}
          </Button>
        ) : null} />

      <ul className="flex flex-wrap gap-2" aria-label="Order status">
        <li><StatusBadge status={order.seller_status} label={`Your fulfillment: ${order.seller_status_display}`} /></li>
        <li><StatusBadge status={order.status} label={`Overall order: ${order.status_display}`} /></li>
        <li><StatusBadge status={order.payment_status} label={`Payment: ${order.payment_status_display}`} /></li>
      </ul>

      {actionMessage ? <Notice tone="success">{actionMessage}</Notice> : null}
      {actionError ? <Notice tone="danger">{actionError}</Notice> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-6">
          <Card padded={false} className="overflow-hidden">
            <CardHeader className="p-5 sm:p-6" title="Your items" description="Only the items your store sold in this order." />
            <div className="overflow-x-auto border-t border-line">
              <table className="mb-table min-w-[32rem]">
                <thead><tr><th scope="col">Product</th><th scope="col" className="text-right">Quantity</th><th scope="col" className="text-right">Total</th></tr></thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-medium text-foreground">{item.product_name}</p>
                        <p className="mt-0.5 font-mono text-xs text-muted">SKU: {item.product_sku}</p>
                      </td>
                      <td className="text-right text-slate-700"><span className="sr-only">Quantity: </span>{item.quantity}</td>
                      <td className="text-right font-semibold text-foreground">{formatMoney(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={2} className="!border-b-0 !bg-sunken/60 !text-sm !font-medium !tracking-normal text-foreground">Seller total</th>
                    <td className="bg-sunken/60 text-right text-base font-semibold text-foreground" data-numeric>{formatMoney(order.seller_total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Overall order history" description="This is the overall order history, not the individual seller fulfillment history." />
            {order.status_history.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No status history yet.</p>
            ) : (
              <Timeline className="mt-5" items={order.status_history.map((event, index) => ({
                id: event.id,
                title: <span className="capitalize">{(event.old_status || "created").replaceAll("_", " ")} → {event.new_status.replaceAll("_", " ")}</span>,
                meta: formatDate(event.created_at),
                description: event.note || undefined,
                tone: index === order.status_history.length - 1 ? statusTone(event.new_status) : "neutral",
              }))} />
            )}
          </Card>
        </div>

        <aside className="grid gap-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader title="Fulfillment address" />
            <DetailList className="mt-4" columns={1} items={[
              { label: "Receiver", value: order.receiver_name },
              { label: "Phone", value: order.receiver_phone },
              { label: "Address", value: `${order.address}, ${order.city}, ${order.province}, ${order.postal_code}` },
              ...(order.customer_note ? [{ label: "Customer note", value: order.customer_note }] : []),
            ]} />
          </Card>
          <Card>
            <CardHeader title="Important dates" />
            <DetailList className="mt-4" columns={1} items={[
              { label: "Created", value: formatDate(order.created_at) },
              { label: "Paid", value: formatDate(order.paid_at) },
              { label: "Delivered", value: formatDate(order.delivered_at) },
            ]} />
          </Card>
        </aside>
      </div>
    </section>
  );
}
