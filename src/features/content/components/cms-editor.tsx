"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Save } from "lucide-react";
import { createCms, listCmsAll, updateCms } from "../api";
import { recordLabel } from "../definitions";
import type { Field, ResourceDefinition } from "../definitions";
import { safeContentUrl, toDateTimeLocal, toIsoDateTime } from "../safety";
import type { CmsRecord, CmsResource } from "../types";
import { getApiErrorMessage } from "@/lib/api/errors";

type EditorProps = {
  resource: CmsResource; definition: ResourceDefinition; initial: CmsRecord | null;
  onClose: () => void; onSaved: () => void; canPublish: boolean;
};
const defaultValues: Partial<Record<CmsResource, Record<string, unknown>>> = {
  pages: { page_type: "custom", is_featured: false, order: 0 },
  banners: { placement: "home_hero", is_clickable: true, order: 0 },
  "faq-categories": { is_active: false, order: 0 },
  faqs: { is_active: false, is_featured: false, order: 0 },
  announcements: { placement: "global", level: "info", is_dismissible: true, order: 0 },
  navigation: { placement: "header", is_active: false, order: 0 },
  "navigation-items": { is_active: false, requires_auth: false, open_in_new_tab: false, order: 0 },
};

function inputValue(row: Record<string, unknown>, field: Field): string | number | boolean {
  const raw = row[field.name];
  if (field.type === "boolean") return raw === true;
  if (field.type === "datetime") return toDateTimeLocal(raw);
  if (field.type === "relation") return typeof raw === "number" ? String(raw) : "";
  if (field.type === "number") return typeof raw === "number" ? raw : 0;
  return typeof raw === "string" ? raw : "";
}

export function CmsEditor({ resource, definition, initial, onClose, onSaved, canPublish }: EditorProps) {
  const [values, setValues] = useState<Record<string, string | number | boolean>>(() => {
    const origin = { ...(defaultValues[resource] ?? {}), ...(initial ?? {}) };
    return Object.fromEntries(definition.fields.map((field) => [field.name, inputValue(origin, field)]));
  });
  const [uploads, setUploads] = useState<Record<string, File | undefined>>({});
  const [related, setRelated] = useState<Partial<Record<CmsResource, CmsRecord[]>>>({});
  const [relationsError, setRelationsError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const relationResources = useMemo(() => Array.from(new Set(definition.fields.filter((f) => f.relation).map((f) => f.relation!))), [definition.fields]);

  useEffect(() => {
    let active = true;
    void Promise.all(relationResources.map(async (key) => ({ key, data: await listCmsAll(key) })))
      .then((arr) => {
        if (active) {
          setRelated(Object.fromEntries(arr.map(({ key, data }) => [key, data.results])));
          setRelationsError(arr.some(({ data }) => data.truncated) ? "Very large reference list: showing the first 20 pages." : "");
        }
      })
      .catch((reason: unknown) => { if (active) setRelationsError(getApiErrorMessage(reason)); });
    return () => { active = false; };
  }, [relationResources]);

  function setValue(name: string, value: string | number | boolean) {
    setValues((v) => ({ ...v, [name]: value }));
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    try {
      const body: Record<string, unknown> = {};
      for (const field of definition.fields) {
        if (field.type === "image") continue;
        const val = values[field.name];
        if (field.type === "datetime") body[field.name] = toIsoDateTime(String(val || ""));
        else if (field.type === "relation") body[field.name] = val ? Number(val) : null;
        else if (field.type === "number") body[field.name] = Number(val);
        else if (field.type === "boolean") body[field.name] = Boolean(val);
        else body[field.name] = val ?? "";
        if ((field.name === "link_url") && val && !safeContentUrl(val)) {
          throw new Error("Links must use an internal /path or an http(s) URL.");
        }
      }
      if (resource === "navigation-items") {
        if (!body.link_url && !body.page) throw new Error("Choose an internal page or enter a link URL.");
      }
      if (resource === "banners" && !initial && !uploads.image) throw new Error("A desktop banner image is required.");
      if (("starts_at" in body) && ("ends_at" in body) && body.starts_at && body.ends_at && String(body.starts_at) >= String(body.ends_at)) {
        throw new Error("End date must be later than the start date.");
      }
      if (!canPublish && "is_active" in body && body.is_active === true) {
        throw new Error("Activating content requires publishing permission.");
      }
      let payload: Record<string, unknown> | FormData = body;
      if (resource === "banners") {
        const form = new FormData();
        for (const [key, value] of Object.entries(body)) {
          if (value === null) form.append(key, "");
          else form.append(key, String(value));
        }
        for (const [key, file] of Object.entries(uploads)) if (file) form.append(key, file);
        payload = form;
      }
      setBusy(true);
      if (initial) await updateCms(resource, definition.routeKey(initial), payload);
      else await createCms(resource, payload);
      onSaved();
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/45" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="cms-editor-title" className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">Content workspace</p><h2 id="cms-editor-title" className="mt-1 text-xl font-bold text-slate-950">{initial ? `Edit ${definition.singular}` : `Create ${definition.singular}`}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close editor" className="rounded-xl p-2 hover:bg-slate-100"><X size={21} /></button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
            {relationsError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{relationsError}</p>}
            {definition.publishable && <p className="rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-900">Changes are saved as editorial content. Publishing or archiving requires a separate action and the appropriate role. Published items require publisher rights to edit.</p>}
            {definition.fields.map((field) => {
              const id = `cms-${field.name}`;
              const value = values[field.name];
              return <div key={field.name} className="space-y-1.5">
                {field.type === "boolean" ? (
                  <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-800"><input id={id} type="checkbox" checked={Boolean(value)} disabled={field.name === "is_active" && !canPublish} onChange={(e) => setValue(field.name, e.target.checked)} className="h-4 w-4 accent-cyan-700" />{field.label}</label>
                ) : (
                  <><label htmlFor={id} className="block text-sm font-semibold text-slate-700">{field.label}{field.required && <span className="ml-1 text-rose-600">*</span>}</label>
                  {field.type === "textarea" ? (
                    <textarea id={id} required={field.required} rows={field.name === "content" || field.name === "answer" ? 8 : 3} value={String(value ?? "")} onChange={(e) => setValue(field.name, e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-cyan-600 focus:outline-none" />
                  ) : field.type === "select" ? (
                    <select id={id} required={field.required} value={String(value ?? field.choices?.[0] ?? "")} onChange={(e) => setValue(field.name, e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">{field.choices?.map((opt) => <option key={opt} value={opt}>{opt.replaceAll("_", " ")}</option>)}</select>
                  ) : field.type === "relation" ? (
                    <select id={id} required={field.required} value={String(value ?? "")} onChange={(e) => setValue(field.name, e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">{field.required ? "Choose an item" : "None"}</option>{(related[field.relation!] ?? []).filter((row) => !(resource === "navigation-items" && field.name === "parent" && (row.id === initial?.id || row.parent != null))).map((row) => <option key={row.id} value={row.id}>{recordLabel(field.relation!, row)} (#{row.id})</option>)}</select>
                  ) : field.type === "image" ? (
                    <div className="space-y-2"><input id={id} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 8 * 1024 * 1024) { setError("Images must be at most 8 MB."); e.target.value = ""; return; }
                      setUploads((old) => ({ ...old, [field.name]: f }));
                    }} className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    {initial && typeof initial[field.name] === "string" && <p className="truncate text-xs text-slate-500">Existing: {String(initial[field.name])}</p>}</div>
                  ) : (
                    <input id={id} type={field.type === "datetime" ? "datetime-local" : field.type === "number" ? "number" : "text"} required={field.required} min={field.type === "number" ? 0 : undefined} value={String(value ?? "")} onChange={(e) => setValue(field.name, field.type === "number" ? Number(e.target.value) : e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-cyan-600 focus:outline-none" />
                  )}</>
                )}
                {field.help && <p className="text-xs leading-5 text-slate-500">{field.help}</p>}
              </div>;
            })}
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={17} />{busy ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
