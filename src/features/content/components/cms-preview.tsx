"use client";

/* eslint-disable @next/next/no-img-element */
import { EyeOff, X } from "lucide-react";

import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { StatusBadge } from "@/components/ui/badge";
import { DetailList } from "@/components/ui/data-display";

import { CMS_RESOURCES, recordLabel } from "../definitions";
import { safeImageUrl, summarizeText } from "../safety";
import type { CmsRecord, CmsResource } from "../types";

/** Authenticated editor-only preview: renders text as text, never raw HTML. */
export function CmsPreview({ resource, row, onClose }: { resource: CmsResource; row: CmsRecord; onClose: () => void }) {
  const image = resource === "banners" ? safeImageUrl(row.image) : null;
  const text = typeof row.content === "string" ? row.content : typeof row.message === "string" ? row.message : typeof row.answer === "string" ? row.answer : typeof row.subtitle === "string" ? row.subtitle : typeof row.description === "string" ? row.description : "";
  const status = String(row.status ?? (row.is_active ? "active" : "inactive"));
  return <AccessibleDialog onClose={onClose} labelledBy="cms-preview-heading" closeOnBackdrop
    overlayClassName="fixed inset-0 z-[60] flex items-end justify-center bg-ink/55 backdrop-blur-[2px] sm:items-center sm:p-6"
    className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-line bg-surface shadow-2xl outline-none sm:rounded-3xl">
    <div className="flex items-center justify-between gap-3 border-b border-line bg-sunken/70 px-5 py-3 sm:px-7">
      <p className="flex items-center gap-2 text-xs font-medium text-muted"><EyeOff size={14} aria-hidden="true" />Private preview · {CMS_RESOURCES[resource].singular} · not a public page</p>
      <button type="button" onClick={onClose} aria-label="Close preview" className="inline-flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-foreground"><X size={20} aria-hidden="true" /></button>
    </div>
    <article className="px-5 py-6 sm:px-9 sm:py-8">
      <StatusBadge status={status} label={`Status: ${status}`} />
      <h2 id="cms-preview-heading" className="mb-display mt-4 text-[2.25rem] text-foreground sm:text-[2.75rem] [overflow-wrap:anywhere]">{recordLabel(resource, row)}</h2>
      {image && <img src={image} alt={String(row.title ?? "Banner preview")} className="mt-6 max-h-80 w-full rounded-2xl object-cover" />}
      {text && <div className="mt-6 max-w-[65ch] text-[0.9375rem] leading-7 whitespace-pre-wrap break-words text-slate-700">{text}</div>}
      <DetailList className="mt-8 border-t border-line pt-6"
        items={CMS_RESOURCES[resource].columns.filter((key) => key !== "title").map((key) => ({ label: key.replaceAll("_", " "), value: summarizeText(row[key], 80) }))} />
    </article>
  </AccessibleDialog>;
}
