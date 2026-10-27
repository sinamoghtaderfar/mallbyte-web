"use client";

/* eslint-disable @next/next/no-img-element */
import { X } from "lucide-react";
import type { CmsRecord, CmsResource } from "../types";
import { CMS_RESOURCES, recordLabel } from "../definitions";
import { safeImageUrl, summarizeText } from "../safety";

/** Authenticated editor-only preview: renders text as text, never raw HTML. */
export function CmsPreview({ resource, row, onClose }: { resource: CmsResource; row: CmsRecord; onClose: () => void }) {
  const image = resource === "banners" ? safeImageUrl(row.image) : null;
  const text = typeof row.content === "string" ? row.content : typeof row.message === "string" ? row.message : typeof row.answer === "string" ? row.answer : typeof row.subtitle === "string" ? row.subtitle : typeof row.description === "string" ? row.description : "";
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="cms-preview-heading" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-9"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">Private CMS preview · {CMS_RESOURCES[resource].singular}</p><h2 id="cms-preview-heading" className="mt-3 text-3xl font-bold text-slate-950">{recordLabel(resource, row)}</h2><p className="mt-2 text-xs text-slate-500">Status: {String(row.status ?? (row.is_active ? "active" : "inactive"))} · This is not a public page.</p></div><button type="button" onClick={onClose} aria-label="Close preview" className="rounded-xl p-2 hover:bg-slate-100"><X size={21}/></button></div>{image && <img src={image} alt={String(row.title ?? "Banner preview")} className="mt-7 max-h-80 w-full rounded-2xl object-cover"/>}{text && <div className="mt-7 whitespace-pre-wrap break-words text-sm leading-8 text-slate-700">{text}</div>}<div className="mt-7 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">{CMS_RESOURCES[resource].columns.filter((key) => key !== "title").map((key) => <p key={key} className="text-xs"><span className="font-bold text-slate-500">{key.replaceAll("_", " ")}: </span><span className="text-slate-800">{summarizeText(row[key], 80)}</span></p>)}</div></div></div>;
}
