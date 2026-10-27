"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Edit3, Eye, Plus, RefreshCcw, Search, Send, Trash2 } from "lucide-react";
import { deleteCms, listCms, transitionCms } from "../api";
import { CMS_RESOURCES, recordLabel } from "../definitions";
import { summarizeText } from "../safety";
import type { CmsRecord, CmsResource } from "../types";
import { useCmsAccess } from "./cms-route";
import { CmsEditor } from "./cms-editor";
import { CmsPreview } from "./cms-preview";
import { getApiErrorMessage } from "@/lib/api/errors";

function readCell(item: CmsRecord, name: string) {
  const val = item[name];
  if (name === "is_visible" || typeof val === "boolean") {
    return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${val ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{val ? "Yes" : "No"}</span>;
  }
  if (name === "status") {
    return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${val === "published" ? "bg-emerald-50 text-emerald-700" : val === "archived" ? "bg-slate-200 text-slate-700" : "bg-amber-50 text-amber-700"}`}>{String(val)}</span>;
  }
  if (name === "updated_at" && typeof val === "string") return <time dateTime={val}>{new Date(val).toLocaleDateString()}</time>;
  return summarizeText(val ?? "—", 72);
}

export function CmsResourcePanel({ resource }: { resource: CmsResource }) {
  const definition = CMS_RESOURCES[resource];
  const access = useCmsAccess();
  const [items, setItems] = useState<CmsRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<CmsRecord | "new" | null>(null);
  const [preview, setPreview] = useState<CmsRecord | null>(null);

  useEffect(() => {
    let active = true;
    void listCms<CmsRecord>(resource, page)
      .then((data) => {
        if (!active) return;
        setItems(data.results);
        setTotal(data.count);
        setHasNext(Boolean(data.next));
        setError("");
      })
      .catch((reason: unknown) => { if (active) setError(getApiErrorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [resource, page, version]);

  const visibleItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? items.filter((row) => JSON.stringify(row).toLowerCase().includes(term)) : items;
  }, [items, query]);
  function refresh() { setLoading(true); setNotice(""); setVersion((v) => v + 1); }
  async function runAction(row: CmsRecord, action: "publish" | "archive" | "delete") {
    const label = recordLabel(resource, row);
    if (!window.confirm(action === "delete" ? `Permanently delete "${label}"? This cannot be undone.` : `${action === "publish" ? "Publish" : "Archive"} "${label}"?`)) return;
    setWorking(row.id); setError(""); setNotice("");
    try {
      if (action === "delete") await deleteCms(resource, definition.routeKey(row));
      else if (resource === "pages" || resource === "banners" || resource === "announcements") await transitionCms(resource, definition.routeKey(row), action);
      refresh();
      setNotice(`Successfully ${action === "delete" ? "deleted" : action === "publish" ? "published" : "archived"} ${label}.`);
    } catch (reason) { setError(getApiErrorMessage(reason)); }
    finally { setWorking(null); }
  }

  return <section className="space-y-5" aria-labelledby="cms-resource-title">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Content library</p><h2 id="cms-resource-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{definition.title}</h2><p className="mt-1 text-sm text-slate-500">{definition.description}</p></div>
      <div className="flex gap-2"><button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCcw size={16} />Refresh</button>{access.canEdit && <button type="button" onClick={() => setEditor("new")} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} />New {definition.singular}</button>}</div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative w-full max-w-sm"><Search size={17} className="absolute left-3 top-3 text-slate-400"/><input type="search" aria-label={`Filter ${definition.title}`} placeholder="Filter visible rows…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:outline-cyan-700"/></div>
      <p className="text-xs text-slate-500">{total} total · page {page} · search filters current page</p>
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button className="ml-3 underline" type="button" onClick={refresh}>Retry</button></div>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading && <p role="status" className="p-6 text-sm text-slate-500">Loading content…</p>}
      {!loading && visibleItems.length === 0 && <div className="p-10 text-center"><p className="font-semibold text-slate-800">No records on this page</p><p className="mt-2 text-sm text-slate-500">Create content or change the filter.</p></div>}
      {!loading && visibleItems.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{definition.columns.map((key) => <th key={key} scope="col" className="px-4 py-3 font-semibold">{key.replaceAll("_", " ")}</th>)}<th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleItems.map((row) => {
        const publiclyActive = row.status === "published" || (row.status === undefined && row.is_active === true);
        const canModify = access.canEdit && (!publiclyActive || access.canPublish);
        return <tr key={row.id} className="hover:bg-slate-50"><td className="px-4 py-4 font-medium text-slate-900">{readCell(row, definition.columns[0])}</td>{definition.columns.slice(1).map((key) => <td key={key} className="px-4 py-4 text-slate-600">{readCell(row, key)}</td>)}<td className="px-4 py-4"><div className="flex justify-end gap-2">
          <button aria-label={`Preview ${recordLabel(resource, row)}`} title="Private preview" onClick={() => setPreview(row)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:text-cyan-800"><Eye size={15}/></button>
          {canModify && <button aria-label={`Edit ${recordLabel(resource, row)}`} title="Edit" onClick={() => setEditor(row)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-cyan-300 hover:text-cyan-800"><Edit3 size={15}/></button>}
          {definition.publishable && access.canPublish && row.status !== "published" && <button aria-label={`Publish ${recordLabel(resource, row)}`} title="Publish" disabled={working === row.id} onClick={() => void runAction(row, "publish")} className="rounded-lg border border-emerald-200 p-2 text-emerald-700 disabled:opacity-50"><Send size={15}/></button>}
          {definition.publishable && access.canPublish && row.status === "published" && <button aria-label={`Archive ${recordLabel(resource, row)}`} title="Archive" disabled={working === row.id} onClick={() => void runAction(row, "archive")} className="rounded-lg border border-amber-200 p-2 text-amber-700 disabled:opacity-50"><Archive size={15}/></button>}
          {canModify && <button aria-label={`Delete ${recordLabel(resource, row)}`} title="Delete" disabled={working === row.id} onClick={() => void runAction(row, "delete")} className="rounded-lg border border-rose-200 p-2 text-rose-700 disabled:opacity-50"><Trash2 size={15}/></button>}
        </div></td></tr>;
      })}</tbody></table></div>}
    </div>
    <div className="flex items-center justify-end gap-3"><button type="button" onClick={() => { setPage((v) => Math.max(1, v - 1)); setLoading(true); }} disabled={loading || page === 1} className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-slate-600">Page {page}</span><button type="button" onClick={() => { setPage((v) => v + 1); setLoading(true); }} disabled={loading || !hasNext} className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">Next</button></div>
    {preview && <CmsPreview resource={resource} row={preview} onClose={() => setPreview(null)} />}
    {editor !== null && <CmsEditor resource={resource} definition={definition} initial={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} canPublish={access.canPublish} />}
  </section>;
}
