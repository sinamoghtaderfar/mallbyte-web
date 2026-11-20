"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Edit3, Eye, FileStack, Plus, RefreshCcw, Search, Send, Trash2 } from "lucide-react";

import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableFrame } from "@/components/ui/data-display";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

import { deleteCms, listCms, transitionCms } from "../api";
import { CMS_RESOURCES, recordLabel } from "../definitions";
import { summarizeText } from "../safety";
import type { CmsRecord, CmsResource } from "../types";
import { CmsEditor } from "./cms-editor";
import { CmsPreview } from "./cms-preview";
import { useCmsAccess } from "./cms-route";

type RowAction = "publish" | "archive" | "delete";

const columnLabels: Record<string, string> = {
  page_type: "Type", is_visible: "Visible", updated_at: "Updated", is_active: "Active", is_featured: "Featured",
  category_name: "Category", page_title: "Page",
};
function columnLabel(key: string) {
  const text = columnLabels[key] ?? key.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function readCell(item: CmsRecord, name: string) {
  const val = item[name];
  if (name === "is_visible" || typeof val === "boolean") {
    return <Badge tone={val ? "success" : "neutral"}>{val ? "Yes" : "No"}</Badge>;
  }
  if (name === "status") return <StatusBadge status={String(val)} label={String(val)} />;
  if (name === "updated_at" && typeof val === "string") {
    return <time dateTime={val} className="whitespace-nowrap">{new Date(val).toLocaleDateString()}</time>;
  }
  if (typeof val === "number") return <span data-numeric>{val}</span>;
  return summarizeText(val ?? "—", 72);
}

const actionCopy: Record<RowAction, { title: (label: string) => string; description: string; confirm: string; done: string }> = {
  publish: { title: (l) => `Publish "${l}"?`, description: "It becomes visible on the storefront according to its schedule and placement.", confirm: "Publish", done: "published" },
  archive: { title: (l) => `Archive "${l}"?`, description: "It is removed from the storefront but kept in the library.", confirm: "Archive", done: "archived" },
  delete: { title: (l) => `Permanently delete "${l}"?`, description: "This cannot be undone.", confirm: "Delete permanently", done: "deleted" },
};

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
  const [pending, setPending] = useState<{ row: CmsRecord; action: RowAction } | null>(null);

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
  async function runAction(row: CmsRecord, action: RowAction) {
    const label = recordLabel(resource, row);
    setWorking(row.id); setError(""); setNotice("");
    try {
      if (action === "delete") await deleteCms(resource, definition.routeKey(row));
      else if (resource === "pages" || resource === "banners" || resource === "announcements") await transitionCms(resource, definition.routeKey(row), action);
      refresh();
      setNotice(`Successfully ${actionCopy[action].done} ${label}.`);
    } catch (reason) { setError(getApiErrorMessage(reason)); }
    finally { setWorking(null); setPending(null); }
  }

  const iconButton = "inline-flex size-10 items-center justify-center rounded-lg border border-line bg-surface text-slate-600 transition-colors hover:border-line-strong hover:text-foreground disabled:opacity-45";
  const newButton = access.canEdit
    ? <Button onClick={() => setEditor("new")}><Plus size={16} aria-hidden="true" />New {definition.singular.toLowerCase()}</Button>
    : null;

  return <section className="grid min-w-0 gap-5" aria-labelledby="cms-resource-title">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-eyebrow">Content library</p>
        <h2 id="cms-resource-title" className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-[1.375rem]">{definition.title}</h2>
        <p className="mt-1 text-sm text-muted">{definition.description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={refresh} disabled={loading}><RefreshCcw size={16} aria-hidden="true" />Refresh</Button>
        {newButton}
      </div>
    </div>

    <Card className="p-3 sm:p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input type="search" aria-label={`Filter ${definition.title}`} placeholder="Filter this page…" value={query}
            onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <p className="px-1 text-xs text-muted" data-numeric>{total} total · page {page} · filter applies to the loaded page</p>
      </div>
    </Card>

    {error && <Notice tone="danger" title="Content could not be loaded or changed" action={<Button size="small" variant="secondary" onClick={refresh}>Retry</Button>}>{error}</Notice>}
    {notice && <Notice tone="success">{notice}</Notice>}

    {loading
      ? <div className="mb-card grid gap-px overflow-hidden" aria-busy="true">
        <p role="status" className="sr-only">Loading content…</p>
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex items-center gap-4 px-4 py-4"><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-24 rounded-full" /></div>)}
      </div>
      : visibleItems.length === 0
        ? <EmptyState icon={<FileStack size={24} />}
          title={query ? "No matches on this page" : "No records on this page"}
          description={query ? "Clear the filter or move to another page." : access.canEdit ? `Create the first ${definition.singular.toLowerCase()} to get started.` : "Nothing has been created here yet."}
          action={query ? <Button variant="secondary" onClick={() => setQuery("")}>Clear filter</Button> : newButton} />
        : <TableFrame>
          <table className="mb-table min-w-[44rem]">
            <thead><tr>
              {definition.columns.map((key) => <th key={key} scope="col">{columnLabel(key)}</th>)}
              <th scope="col" className="text-right">Actions</th>
            </tr></thead>
            <tbody>{visibleItems.map((row) => {
              const publiclyActive = row.status === "published" || (row.status === undefined && row.is_active === true);
              const canModify = access.canEdit && (!publiclyActive || access.canPublish);
              const label = recordLabel(resource, row);
              return <tr key={row.id}>
                <td className="max-w-[18rem] font-medium text-foreground [overflow-wrap:anywhere]">{readCell(row, definition.columns[0])}</td>
                {definition.columns.slice(1).map((key) => <td key={key} className="text-slate-600">{readCell(row, key)}</td>)}
                <td>
                  <div className="flex justify-end gap-1.5">
                    <button type="button" aria-label={`Preview ${label}`} title="Private preview" onClick={() => setPreview(row)} className={iconButton}><Eye size={16} aria-hidden="true" /></button>
                    {canModify && <button type="button" aria-label={`Edit ${label}`} title="Edit" onClick={() => setEditor(row)} className={iconButton}><Edit3 size={16} aria-hidden="true" /></button>}
                    {definition.publishable && access.canPublish && row.status !== "published" && <button type="button" aria-label={`Publish ${label}`} title="Publish" disabled={working === row.id} onClick={() => setPending({ row, action: "publish" })} className={`${iconButton} text-emerald-700 hover:border-emerald-300 hover:text-emerald-800`}><Send size={16} aria-hidden="true" /></button>}
                    {definition.publishable && access.canPublish && row.status === "published" && <button type="button" aria-label={`Archive ${label}`} title="Archive" disabled={working === row.id} onClick={() => setPending({ row, action: "archive" })} className={`${iconButton} text-amber-800 hover:border-amber-300`}><Archive size={16} aria-hidden="true" /></button>}
                    {canModify && <button type="button" aria-label={`Delete ${label}`} title="Delete" disabled={working === row.id} onClick={() => setPending({ row, action: "delete" })} className={`${iconButton} text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800`}><Trash2 size={16} aria-hidden="true" /></button>}
                  </div>
                </td>
              </tr>;
            })}</tbody>
          </table>
        </TableFrame>}

    <Pagination label={`${definition.title} pages`} summary={`Page ${page}`}
      canPrevious={page > 1} canNext={hasNext} disabled={loading}
      onPrevious={() => { setPage((v) => Math.max(1, v - 1)); setLoading(true); }}
      onNext={() => { setPage((v) => v + 1); setLoading(true); }} />

    {pending && <ConfirmDialog
      title={actionCopy[pending.action].title(recordLabel(resource, pending.row))}
      description={actionCopy[pending.action].description}
      confirmLabel={actionCopy[pending.action].confirm}
      tone={pending.action === "delete" ? "danger" : "primary"}
      busy={working === pending.row.id}
      onCancel={() => setPending(null)}
      onConfirm={() => void runAction(pending.row, pending.action)} />}
    {preview && <CmsPreview resource={resource} row={preview} onClose={() => setPreview(null)} />}
    {editor !== null && <CmsEditor resource={resource} definition={definition} initial={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} canPublish={access.canPublish} />}
  </section>;
}
