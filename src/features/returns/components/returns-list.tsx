"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ChevronRight, RotateCcw } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

import { getReturns } from "../api";
import type { ReturnListItem } from "../types";

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function ReturnsList() {
  const [returns, setReturns] = useState<ReturnListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReturns() {
      try {
        setIsLoading(true);
        setError("");

        const data = await getReturns();

        if (isMounted) {
          setReturns(data);
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

    loadReturns();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="grid gap-6" aria-busy="true">
        <p role="status" className="sr-only">Loading return requests...</p>
        <Skeleton className="h-20 max-w-md" />
        <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      </section>
    );
  }

  if (error) {
    return <Notice tone="danger" title="We couldn't load your returns">{error}</Notice>;
  }

  return (
    <section className="grid gap-6">
      <PageHeader eyebrow="Customer service" title="Return Requests"
        description="Track your return and refund requests after delivered orders." />

      {returns.length === 0 ? (
        <EmptyState icon={<RotateCcw size={24} />} title="No return requests yet."
          description="You can request a return from a delivered order while it is within the return window."
          action={<Link href="/orders" className={buttonStyles({ variant: "secondary" })}>View your orders</Link>} />
      ) : (
        <ul className="grid gap-3">
          {returns.map((returnRequest) => (
            <li key={returnRequest.id}>
              <Link href={`/returns/${returnRequest.id}`}
                className="group grid gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-md sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-6 sm:px-5">
                <div className="min-w-0">
                  <p className="font-mono text-[0.8125rem] font-semibold text-foreground">{returnRequest.request_number}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatDate(returnRequest.created_at)} · Order <span className="font-mono">{returnRequest.order_number}</span></p>
                </div>
                <StatusBadge status={returnRequest.status} label={formatStatus(returnRequest.status)} />
                <span className="text-sm font-semibold text-foreground" data-numeric>{formatMoney(returnRequest.total_requested_amount)}</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 group-hover:text-foreground">
                  View details<ChevronRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
