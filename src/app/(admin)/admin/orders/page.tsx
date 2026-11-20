"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getOrders } from "@/features/orders/api";
import type { OrderListItem } from "@/features/orders/types";
import { StatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { formatAmount } from "@/components/ui/price";
import { Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const result = await getOrders();

        if (!cancelled) {
          setOrders(result.results);
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

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;

    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);

  return (
    <main className="grid gap-6">
      <PageHeader eyebrow="Admin" title="Order management"
        description="Review orders and manage their fulfillment through Shipping and Returns."
        actions={<>
          <Link href="/admin/shipments" className={buttonStyles()}>Manage shipments</Link>
          <Link href="/admin/returns" className={buttonStyles({ variant: "secondary" })}>Manage returns</Link>
        </>} />

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
          <CardHeader title="Orders" description="Filtering applies to the loaded orders." />
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Order status
            <Select value={filter} onChange={(event) => setFilter(event.target.value)} className="w-52">
              <option value="all">All orders</option>
              <option value="pending_payment">Pending payment</option>
              <option value="paid">Paid</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </Select>
          </label>
        </div>

        {isLoading ? (
          <div role="status" className="grid gap-2 border-t border-line p-5">
            <span className="sr-only">Loading orders...</span>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : error ? (
          <div className="border-t border-line p-5"><Notice tone="danger">{error}</Notice></div>
        ) : filteredOrders.length === 0 ? (
          <p className="border-t border-line px-5 py-10 text-center text-sm text-muted">No orders found.</p>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="mb-table min-w-[44rem]">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Status</th>
                  <th scope="col">Payment</th>
                  <th scope="col" className="text-right">Total</th>
                  <th scope="col">Date</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono text-[0.8125rem] font-semibold text-foreground">{order.order_number}</td>
                    <td><StatusBadge status={order.status} label={order.status_display} /></td>
                    <td><StatusBadge status={order.payment_status} label={order.payment_status_display} /></td>
                    <td className="text-right font-medium text-foreground">{formatAmount(order.total_amount)}</td>
                    <td className="whitespace-nowrap text-muted">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="text-right">
                      <Link href={`/orders/${order.id}`} className={buttonStyles({ variant: "secondary", size: "small" })}>View order</Link>
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
