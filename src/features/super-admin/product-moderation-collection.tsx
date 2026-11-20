"use client";

import { useEffect, useRef, useState } from "react";
import { Check, PackageSearch, X } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PaginatedResponse } from "@/types/api";

type Product = { id: number; name: string; sku: string; status: string; seller_email: string; is_active: boolean };

const PAGE_SIZE = 20;
const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
];

export function ProductModerationCollection() {
  const [query, setQuery] = useState({ status: "pending", page: 1, version: 0 });
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejecting, setRejecting] = useState<Product | null>(null);
  const request = useRef(0);
  const mounted = useRef(false);
  function changeQuery(next: Partial<typeof query>) {
    request.current += 1;
    setLoading(true);
    setError("");
    setQuery((current) => ({ ...current, ...next, version: current.version + 1 }));
  }
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const id = ++request.current;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get<PaginatedResponse<Product> | Product[]>("/api/rbac/console/products/", {
          params: { page: query.page, page_size: PAGE_SIZE, status: query.status }, signal: controller.signal,
        });
        if (id !== request.current) return;
        const result = response.data;
        setData(Array.isArray(result) ? { count: result.length, next: null, previous: null, results: result } : result);
      } catch (reason) {
        if (id === request.current) { setData(null); setError(getApiErrorMessage(reason)); }
      } finally {
        if (id === request.current) setLoading(false);
      }
    }
    void load();
    return () => { request.current += 1; controller.abort(); };
  }, [query]);
  async function moderate(product: Product, action: "approve" | "reject", reason?: string) {
    setMutating(true);
    setError("");
    setNotice("");
    try {
      const url = `/api/products/products/${product.id}/${action}/`;
      if (action === "approve") await apiClient.post(url);
      else await apiClient.post(url, { reason });
      if (!mounted.current) return;
      setNotice(action === "approve" ? "Product approved." : "Product rejected.");
      setRejecting(null);
      changeQuery({ page: 1 });
    } catch (reason) {
      if (mounted.current) setError(getApiErrorMessage(reason));
    } finally {
      if (mounted.current) setMutating(false);
    }
  }
  const busy = loading || mutating;
  const pageCount = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const statusLabel = statusOptions.find((option) => option.value === query.status)?.label.toLowerCase() ?? query.status;

  return <section aria-labelledby="moderation-heading" className="grid gap-4">
    <h2 id="moderation-heading" className="sr-only">Product review</h2>
    <Card className="p-4 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="moderation-status" className="text-sm font-medium text-foreground">Status</label>
          <Select id="moderation-status" className="w-44" value={query.status} disabled={mutating}
            onChange={(event) => changeQuery({ status: event.target.value, page: 1 })}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </div>
        <p className="text-sm text-muted">Approval publishes a product to the storefront; rejection returns it to the seller with your reason.</p>
      </div>
    </Card>

    {error && <Notice tone="danger" title="Product review unavailable"
      action={<Button size="small" variant="secondary" disabled={busy} onClick={() => changeQuery({})}>Retry products</Button>}>{error}</Notice>}
    {notice && <Notice tone="success">{notice}</Notice>}

    {loading
      ? <div className="grid gap-2" aria-busy="true"><p role="status" className="sr-only">Loading products…</p>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[4.5rem]" />)}</div>
      : data && data.results.length === 0
        ? <EmptyState icon={<PackageSearch size={24} />} title={`No ${statusLabel} products`} description="No products found for this filter. Choose another status to review earlier decisions." />
        : data && <ul className="mb-card divide-y divide-line overflow-hidden" aria-label="Products">
          {data.results.map((product) => <li key={product.id}>
            <article className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 font-medium text-foreground [overflow-wrap:anywhere]">{product.name}</h3>
                  <StatusBadge status={product.status} />
                  {!product.is_active && <span className="text-xs text-muted">Inactive</span>}
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
                  <span className="font-mono text-xs leading-5 text-slate-700">{product.sku}</span>
                  <span className="[overflow-wrap:anywhere]">{product.seller_email}</span>
                </p>
              </div>
              {product.status === "pending" && <div className="flex shrink-0 gap-2">
                <Button size="small" disabled={busy} onClick={() => void moderate(product, "approve")}><Check size={15} aria-hidden="true" />Approve</Button>
                <Button size="small" variant="secondary" disabled={busy} onClick={() => setRejecting(product)}><X size={15} aria-hidden="true" />Reject</Button>
              </div>}
            </article>
          </li>)}
        </ul>}

    <Pagination label="Product moderation pages"
      summary={loading ? "Loading page…" : data ? `${data.count} matching products · Page ${query.page} of ${pageCount}` : `Page ${query.page}`}
      canPrevious={query.page > 1} canNext={Boolean(data?.next)} disabled={busy}
      previousLabel="Previous matching products" nextLabel="Next matching products"
      onPrevious={() => changeQuery({ page: query.page - 1 })} onNext={() => changeQuery({ page: query.page + 1 })} />

    {rejecting && <ConfirmDialog title={`Reject ${rejecting.name}?`}
      description="The seller sees this reason and can revise the product before resubmitting."
      reasonLabel="Reason for rejection" reasonMinLength={5} confirmLabel="Reject product" tone="danger" busy={mutating}
      onCancel={() => setRejecting(null)} onConfirm={(reason) => void moderate(rejecting, "reject", reason)} />}
  </section>;
}
