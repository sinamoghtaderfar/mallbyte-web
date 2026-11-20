"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  type AdminSeller,
  type AdminSellerStatus,
  getAdminSellers,
} from "@/features/admin-sellers/api";
import { BadgeCheck, Clock3, Store } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

const statusLabels: Record<AdminSellerStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function getSellerStoreLabel(seller: AdminSeller) {
  return (
    seller.store_name ||
    seller.business_name ||
    seller.business_email ||
    getSellerOwnerLabel(seller)
  );
}

function getSellerOwnerLabel(seller: AdminSeller) {
  if (seller.user_full_name || seller.user_email) {
    return seller.user_full_name || seller.user_email;
  }

  if (typeof seller.user === "object") {
    return seller.user.full_name || seller.user.email;
  }

  return String(seller.user);
}

export function AdminSellersList() {
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [query, setQuery] = useState<{
    page: number;
    status: "all" | AdminSellerStatus;
  }>({ page: 1, status: "all" });
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
  });
  const [retry, setRetry] = useState(0);
  const requestVersion = useRef(0);
  const statusFilter = query.status;

  function changeQuery(next: typeof query) {
    requestVersion.current += 1;
    setIsLoading(true);
    setError("");
    setQuery(next);
  }
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const request = ++requestVersion.current;
    const controller = new AbortController();
    const isCurrent = () => request === requestVersion.current;

    async function loadSellers() {
      try {
        setIsLoading(true);
        setError("");
        const data = await getAdminSellers(
          query.page,
          query.status === "all" ? undefined : query.status,
          controller.signal,
        );

        if (isCurrent()) {
          setSellers(data.results);
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

    void loadSellers();

    return () => {
      requestVersion.current += 1;
      controller.abort();
    };
  }, [query, retry]);

  const pendingCount = sellers.filter(
    (seller) => seller.status === "pending",
  ).length;

  const approvedCount = sellers.filter(
    (seller) => seller.status === "approved",
  ).length;

  return (
    <main className="grid gap-6">
      <PageHeader eyebrow="Admin" title="Seller management"
        description="Review seller applications, approve verified stores, and keep track of rejected or suspended sellers."
        actions={<Link href="/admin/returns" className={buttonStyles({ variant: "secondary" })}>Return management</Link>} />

      <section aria-label="Seller summary" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:gap-4">
        <StatCard label="Matching sellers (all pages)" value={pagination.count} icon={<Store size={16} />} />
        <StatCard label="Pending review (this page)" value={pendingCount} icon={<Clock3 size={16} />} tone={pendingCount ? "brand" : "default"} />
        <StatCard label="Approved sellers (this page)" value={approvedCount} icon={<BadgeCheck size={16} />} />
      </section>

      <Card padded={false} className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <CardHeader title="Seller applications" description="Open an application to verify documents and decide."
            action={<Select aria-label="Seller status" value={statusFilter} className="w-48"
              onChange={(event) => changeQuery({ page: 1, status: event.target.value as "all" | AdminSellerStatus })}>
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>} />
        </div>

        {isLoading ? (
          <div role="status" className="grid gap-2 border-t border-line p-5">
            <span className="sr-only">Loading sellers...</span>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : error ? (
          <div className="border-t border-line p-5">
            <Notice tone="danger" action={<Button size="small" variant="secondary" onClick={() => setRetry((value) => value + 1)}>Retry sellers</Button>}>{error}</Notice>
          </div>
        ) : sellers.length === 0 ? (
          <p className="border-t border-line px-5 py-10 text-center text-sm text-muted">No seller applications found.</p>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="mb-table min-w-[46rem]">
              <thead><tr><th scope="col">Store</th><th scope="col">Owner</th><th scope="col">Status</th><th scope="col" className="text-right">Sales</th><th scope="col">Created</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                {sellers.map((seller) => (
                  <tr key={seller.id}>
                    <td>
                      <Link href={`/admin/sellers/${seller.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">{getSellerStoreLabel(seller)}</Link>
                      <p className="mt-0.5 text-xs text-muted">{seller.business_email}</p>
                    </td>
                    <td className="text-slate-700">{getSellerOwnerLabel(seller)}</td>
                    <td><StatusBadge status={seller.status} label={statusLabels[seller.status] ?? seller.status} /></td>
                    <td className="text-right font-medium text-foreground">{formatMoney(seller.total_sales)}</td>
                    <td className="whitespace-nowrap text-muted">{formatDate(seller.created_at)}</td>
                    <td className="text-right">
                      <Link href={`/admin/sellers/${seller.id}`} className={buttonStyles({ variant: "secondary", size: "small" })}>Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination className="border-t border-line px-5 py-3" label="Seller pages"
          summary={`Page ${query.page} of ${Math.max(1, Math.ceil(pagination.count / 20))}`}
          canPrevious={query.page !== 1 && !isLoading} canNext={Boolean(pagination.next) && !isLoading && !error}
          previousLabel="Previous sellers" nextLabel="Next sellers"
          onPrevious={() => changeQuery({ ...query, page: query.page - 1 })}
          onNext={() => changeQuery({ ...query, page: query.page + 1 })} />
      </Card>
    </main>
  );
}
