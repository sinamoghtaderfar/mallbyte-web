"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type AdminReturnListItem,
  type AdminReturnStatus,
  getAdminReturns,
} from "@/features/returns/admin-api";
import { CheckCircle2, Clock3, RotateCcw } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

const openStatuses: AdminReturnStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "waiting_for_item",
  "item_received",
  "inspecting",
  "refund_pending",
];

const statusLabels: Record<AdminReturnStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  waiting_for_item: "Waiting for item",
  item_received: "Item received",
  inspecting: "Inspecting",
  refund_pending: "Refund pending",
  refunded: "Refunded",
  replaced: "Replaced",
  cancelled: "Cancelled",
  closed: "Closed",
};

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function AdminReturnsList() {
  const [returns, setReturns] = useState<AdminReturnListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | AdminReturnStatus>(
    "all",
  );
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
  });
  const requestVersion = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  function changePage(nextPage: number) {
    requestVersion.current += 1;
    setIsLoading(true);
    setError("");
    setPage(nextPage);
  }

  useEffect(() => {
    const request = ++requestVersion.current;
    const controller = new AbortController();
    const isCurrent = () => request === requestVersion.current;

    async function loadReturns() {
      try {
        setIsLoading(true);
        setError("");
        const data = await getAdminReturns(page, controller.signal);

        if (isCurrent()) {
          setReturns(data.results);
          setPagination(data);
        }
      } catch (caughtError) {
        if (isCurrent()) {
          setError(getApiErrorMessage(caughtError));
        }
      } finally {
        if (isCurrent()) {
          setIsLoading(false);
        }
      }
    }

    void loadReturns();

    return () => {
      requestVersion.current += 1;
      controller.abort();
    };
  }, [page, retry]);

  const filteredReturns = useMemo(() => {
    if (statusFilter === "all") {
      return returns;
    }

    return returns.filter(
      (returnRequest) => returnRequest.status === statusFilter,
    );
  }, [returns, statusFilter]);

  const openCount = returns.filter((returnRequest) =>
    openStatuses.includes(returnRequest.status),
  ).length;

  const refundedCount = returns.filter(
    (returnRequest) => returnRequest.status === "refunded",
  ).length;

  return (
    <main className="grid gap-6">
      <PageHeader eyebrow="Admin" title="Return management"
        description="Review customer return requests, approve or reject them, confirm received items, and mark refunds as completed."
        actions={<Link href="/returns" className={buttonStyles({ variant: "secondary" })}>Customer returns</Link>} />

      <section aria-label="Return summary" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:gap-4">
        <StatCard label="Total requests (all pages)" value={pagination.count} icon={<RotateCcw size={16} />} />
        <StatCard label="Open requests (this page)" value={openCount} icon={<Clock3 size={16} />} tone={openCount ? "brand" : "default"} />
        <StatCard label="Refunded (this page)" value={refundedCount} icon={<CheckCircle2 size={16} />} />
      </section>

      <Card padded={false} className="overflow-hidden">
        <div className="grid gap-3 p-5 sm:p-6">
          <CardHeader title="Return requests"
            description="Status filters and summaries apply to this page. Use navigation to browse all requests."
            action={<Select aria-label="Status on this page" value={statusFilter} className="w-48"
              onChange={(event) => setStatusFilter(event.target.value as "all" | AdminReturnStatus)}>
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>} />
        </div>

        {isLoading ? (
          <div role="status" className="grid gap-2 border-t border-line p-5">
            <span className="sr-only">Loading returns...</span>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : error ? (
          <div className="border-t border-line p-5">
            <Notice tone="danger" action={<Button size="small" variant="secondary" onClick={() => setRetry((value) => value + 1)}>Retry returns</Button>}>{error}</Notice>
          </div>
        ) : filteredReturns.length === 0 ? (
          <p className="border-t border-line px-5 py-8 text-center text-sm text-muted">
            No return requests on this page match the selected status.
          </p>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="mb-table min-w-[46rem]">
              <thead><tr><th scope="col">Request</th><th scope="col">Customer</th><th scope="col">Status</th><th scope="col" className="text-right">Requested</th><th scope="col">Created</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                {filteredReturns.map((returnRequest) => (
                  <tr key={returnRequest.id}>
                    <td>
                      <Link href={`/admin/returns/${returnRequest.id}`} className="font-mono text-[0.8125rem] font-semibold text-foreground underline-offset-4 hover:underline">
                        {returnRequest.request_number}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">Order {returnRequest.order_number}</p>
                    </td>
                    <td className="text-slate-700">{returnRequest.customer}</td>
                    <td><StatusBadge status={returnRequest.status} label={statusLabels[returnRequest.status] ?? returnRequest.status} /></td>
                    <td className="text-right font-medium text-foreground">{formatMoney(returnRequest.total_requested_amount)}</td>
                    <td className="whitespace-nowrap text-muted">{formatDate(returnRequest.created_at)}</td>
                    <td className="text-right">
                      <Link href={`/admin/returns/${returnRequest.id}`} className={buttonStyles({ variant: "secondary", size: "small" })}>Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination className="border-t border-line px-5 py-3" label="Return pages"
          summary={`Page ${page} of ${Math.max(1, Math.ceil(pagination.count / 20))}`}
          canPrevious={page !== 1} canNext={Boolean(pagination.next) && !isLoading && !error}
          previousLabel="Previous returns" nextLabel="Next returns"
          onPrevious={() => changePage(page - 1)} onNext={() => changePage(page + 1)} />
      </Card>
    </main>
  );
}
