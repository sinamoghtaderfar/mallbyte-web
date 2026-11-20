"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ClipboardList } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { TableFrame } from "@/components/ui/data-display";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getSessionGeneration, isCurrentSession } from "@/lib/auth/session-storage";
import type { PaginatedResponse } from "@/types/api";

import { getSellerOrders } from "../api";
import type { SellerOrderListItem } from "../types";

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SellerOrdersList() {
  const [orders, setOrders] = useState<SellerOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [pagination, setPagination] = useState<PaginatedResponse<SellerOrderListItem> | null>(null);
  const requestVersion = useRef(0);

  function changePage(nextPage: number) {
    requestVersion.current += 1;
    setIsLoading(true);
    setError("");
    setPage(nextPage);
  }

  function retryPage() {
    requestVersion.current += 1;
    setIsLoading(true);
    setError("");
    setRetry((current) => current + 1);
  }

  useEffect(() => {
    let isMounted = true;
    const version = ++requestVersion.current;
    const session = getSessionGeneration();
    const controller = new AbortController();
    const current = () => isMounted && version === requestVersion.current && isCurrentSession(session);

    async function loadOrders() {
      try {
        setIsLoading(true);
        setError("");

        const data = await getSellerOrders(page, controller.signal);

        if (current()) {
          setOrders(data.results);
          setPagination(data);
        }
      } catch (loadError) {
        if (current()) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (current()) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [page, retry]);

  const pager = (
    <Pagination label="Seller order pages"
      summary={pagination ? `${pagination.count} seller orders · Page ${page} of ${Math.max(1, Math.ceil(pagination.count / 20))}` : `Page ${page}`}
      canPrevious={page > 1} canNext={!isLoading && !error && Boolean(pagination?.next)}
      previousLabel="Previous seller orders" nextLabel="Next seller orders"
      onPrevious={() => changePage(page - 1)} onNext={() => changePage(page + 1)} />
  );

  if (isLoading) {
    return (
      <section className="grid gap-6" aria-busy="true">
        <p role="status" className="sr-only">Loading seller orders...</p>
        <Skeleton className="h-20 max-w-lg" />
        <div className="mb-card grid gap-px overflow-hidden">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex items-center gap-4 px-4 py-4"><Skeleton className="h-4 flex-1" /><Skeleton className="h-6 w-24 rounded-full" /><Skeleton className="h-4 w-20" /></div>)}</div>
        {pager}
      </section>
    );
  }

  if (error) {
    return (
      <section className="grid gap-6">
        <PageHeader eyebrow="Fulfilment" title="Seller Orders" />
        <Notice tone="danger" title="Seller orders could not be loaded"
          action={<Button size="small" variant="secondary" onClick={retryPage}>Retry seller orders</Button>}>{error}</Notice>
        {pager}
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader eyebrow="Fulfilment" title="Seller Orders"
        description="Manage orders that include your products and move paid orders through the fulfillment flow." />

      {pager}

      {orders.length === 0 ? (
        <EmptyState icon={<ClipboardList size={24} />} title="No seller orders yet."
          description="Orders that include your products appear here once customers check out." />
      ) : (
        <TableFrame>
          <table className="mb-table min-w-[44rem]">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Fulfillment</th>
                <th scope="col">Payment</th>
                <th scope="col" className="text-right">Seller total</th>
                <th scope="col" className="text-right"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <p className="font-mono text-[0.8125rem] font-semibold text-foreground">{order.order_number}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatDate(order.created_at)} · <span>{order.seller_items_count} item(s)</span></p>
                  </td>
                  <td><StatusBadge status={order.seller_status} label={order.seller_status_display} /></td>
                  <td><StatusBadge status={order.payment_status} label={order.payment_status_display} /></td>
                  <td className="text-right font-semibold text-foreground">{formatMoney(order.seller_total_amount)}</td>
                  <td className="text-right">
                    <Link href={`/seller/orders/${order.id}`} className={buttonStyles({ variant: "secondary", size: "small" })}>
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      )}
    </section>
  );
}
