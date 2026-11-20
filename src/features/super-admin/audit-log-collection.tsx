"use client";

import { useEffect, useRef, useState } from "react";
import { History, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PaginatedResponse } from "@/types/api";

type Audit = { id: number; admin_email: string; action: string; target_user_email: string | null; target_role_name: string | null; details: Record<string, unknown>; created_at: string };

const PAGE_SIZE = 20;

export function AuditLogCollection() {
  const [query, setQuery] = useState({ page: 1, version: 0 });
  const [data, setData] = useState<PaginatedResponse<Audit> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);
  function changePage(page: number) {
    request.current += 1;
    setLoading(true);
    setError("");
    setQuery((current) => ({ page, version: current.version + 1 }));
  }
  useEffect(() => {
    const id = ++request.current;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get<PaginatedResponse<Audit> | Audit[]>("/api/rbac/admin-logs/", {
          params: { page: query.page, page_size: PAGE_SIZE }, signal: controller.signal,
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

  return <section aria-labelledby="audit-heading" className="grid gap-4">
    <div>
      <h2 id="audit-heading" className="text-base font-semibold tracking-tight text-foreground">Audit log</h2>
      <p className="mt-1 text-sm text-muted">Privileged changes recorded by the API, newest first. Entries are read-only.</p>
    </div>
    {error && <Notice tone="danger" title="Audit history unavailable"
      action={<Button size="small" variant="secondary" disabled={loading} onClick={() => changePage(query.page)}>Retry audit page</Button>}>{error}</Notice>}
    {loading
      ? <div className="grid gap-2" aria-busy="true"><p role="status" className="sr-only">Loading audit actions…</p>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      : data && data.results.length === 0
        ? <EmptyState icon={<History size={24} />} title="No audit actions found" description="Privileged changes made in this console will appear here." />
        : data && <ol className="mb-card divide-y divide-line overflow-hidden">
          {data.results.map((item) => {
            const hasDetails = item.details && Object.keys(item.details).length > 0;
            return <li key={item.id}>
              <article className="grid gap-2 p-4 sm:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-mono text-[0.8125rem] font-semibold text-foreground [overflow-wrap:anywhere]">{item.action}</h3>
                  <time dateTime={item.created_at} className="text-xs text-muted" data-numeric>{new Date(item.created_at).toLocaleString()}</time>
                </div>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                  <UserRound size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="text-slate-700">{item.admin_email || "Unknown actor"}</span>
                  <span aria-hidden="true">→</span>
                  <span className="sr-only">target</span>
                  <span className="[overflow-wrap:anywhere]">{item.target_user_email || item.target_role_name || "Platform"}</span>
                </p>
                {hasDetails && <details className="group text-xs">
                  <summary className="inline-flex min-h-8 items-center font-medium text-slate-700 hover:text-foreground">Details</summary>
                  <pre className="mt-1 overflow-x-auto rounded-lg border border-line bg-sunken p-3 font-mono text-xs leading-5 whitespace-pre-wrap break-all text-slate-700">{JSON.stringify(item.details, null, 2)}</pre>
                </details>}
              </article>
            </li>;
          })}
        </ol>}
    <Pagination label="Audit log pages"
      summary={loading ? "Loading page…" : data ? `${data.count} audit actions · Page ${query.page} of ${Math.max(1, Math.ceil(data.count / PAGE_SIZE))}` : `Page ${query.page}`}
      canPrevious={query.page > 1} canNext={Boolean(data?.next)} disabled={loading}
      previousLabel="Previous audit actions" nextLabel="Next audit actions"
      onPrevious={() => changePage(query.page - 1)} onNext={() => changePage(query.page + 1)} />
  </section>;
}
