"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PaginatedResponse } from "@/types/api";

type Audit = { id: number; admin_email: string; action: string; target_user_email: string | null; target_role_name: string | null; details: Record<string, unknown>; created_at: string };
const field = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950";

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
          params: { page: query.page, page_size: 20 }, signal: controller.signal,
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
  return <section className="space-y-3">
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" disabled={loading} onClick={() => changePage(query.page)} className="ml-3 underline">Retry audit page</button></div>}
    {loading && <p role="status" className="text-sm text-slate-500">Loading audit actions…</p>}
    {!loading && data?.results.map((item) => <article key={item.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.action}</strong><time className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</time></div><p className="mt-1 text-sm text-slate-600">{item.admin_email || "Unknown actor"} · {item.target_user_email || item.target_role_name || "Platform"}</p><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(item.details, null, 2)}</pre></article>)}
    {!loading && data?.results.length === 0 && <p className="text-sm text-slate-500">No audit actions found.</p>}
    <nav aria-label="Audit log pages" className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"><span>{loading ? "Loading page…" : data ? `${data.count} audit actions · Page ${query.page} of ${Math.max(1, Math.ceil(data.count / 20))}` : `Page ${query.page}`}</span><div className="flex gap-2"><button type="button" className={field} disabled={query.page === 1 || loading} onClick={() => changePage(query.page - 1)}>Previous audit actions</button><button type="button" className={field} disabled={!data?.next || loading || !data} onClick={() => changePage(query.page + 1)}>Next audit actions</button></div></nav>
  </section>;
}
