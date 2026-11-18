"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PaginatedResponse } from "@/types/api";

type Product = { id: number; name: string; sku: string; status: string; seller_email: string; is_active: boolean };
const button = "rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const field = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950";

export function ProductModerationCollection() {
  const [query, setQuery] = useState({ status: "pending", page: 1, version: 0 });
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
          params: { page: query.page, page_size: 20, status: query.status }, signal: controller.signal,
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
      changeQuery({ page: 1 });
    } catch (reason) {
      if (mounted.current) setError(getApiErrorMessage(reason));
    } finally {
      if (mounted.current) setMutating(false);
    }
  }
  const busy = loading || mutating;
  return <section className="space-y-4">
    <div className="flex items-center gap-2"><label htmlFor="moderation-status" className="text-sm font-semibold">Status</label><select id="moderation-status" className={field} value={query.status} disabled={mutating} onChange={(event) => changeQuery({ status: event.target.value, page: 1 })}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="draft">Draft</option></select></div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" disabled={busy} onClick={() => changeQuery({})} className="ml-3 underline">Retry products</button></div>}
    {notice && <p role="status" className="text-sm text-emerald-900">{notice}</p>}
    {loading && <p role="status" className="text-sm text-slate-500">Loading products…</p>}
    <div className="space-y-3">{!loading && data?.results.map((product) => <article key={product.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-5"><div className="flex-1"><h3 className="font-semibold">{product.name}</h3><div className="text-sm text-slate-500">{product.sku} · {product.seller_email} · {product.status}</div></div>{product.status === "pending" && <><button className={button} disabled={busy} onClick={() => void moderate(product, "approve")}>Approve</button><button className={field} disabled={busy} onClick={() => { const reason = window.prompt("Reason for rejection (required)"); if (reason && reason.trim().length >= 5) void moderate(product, "reject", reason); else if (reason !== null) setError("Enter a reason of at least 5 characters."); }}>Reject</button></>}</article>)}{!loading && data?.results.length === 0 && <p className="text-sm text-slate-500">No products found for this filter.</p>}</div>
    <nav aria-label="Product moderation pages" className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"><span>{loading ? "Loading page…" : data ? `${data.count} matching products · Page ${query.page} of ${Math.max(1, Math.ceil(data.count / 20))}` : `Page ${query.page}`}</span><div className="flex gap-2"><button type="button" className={field} disabled={query.page === 1 || busy} onClick={() => changeQuery({ page: query.page - 1 })}>Previous matching products</button><button type="button" className={field} disabled={!data?.next || busy || !data} onClick={() => changeQuery({ page: query.page + 1 })}>Next matching products</button></div></nav>
  </section>;
}
