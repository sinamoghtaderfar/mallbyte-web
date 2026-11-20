"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Save, X } from "lucide-react";

import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/states";
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

const groupMeta = {
  content: { title: "Content", description: "" },
  media: { title: "Media", description: "Uploaded files replace the current artwork when saved." },
  visibility: { title: "Visibility & schedule", description: "Leave dates empty to show content without a time window." },
  seo: { title: "Search appearance", description: "Optional overrides for search engines and link previews." },
} as const;
type GroupKey = keyof typeof groupMeta;

function groupOf(field: Field): GroupKey {
  if (field.name.startsWith("meta_")) return "seo";
  if (field.type === "image") return "media";
  if (field.type === "boolean" || field.type === "datetime" || field.name === "order") return "visibility";
  return "content";
}

/** Splits a resource's fields into titled sections, keeping definition order inside each. */
function groupFields(fields: Field[]) {
  const order: GroupKey[] = ["content", "media", "visibility", "seo"];
  return order
    .map((key) => ({ key, ...groupMeta[key], fields: fields.filter((field) => groupOf(field) === key) }))
    .filter((group) => group.fields.length > 0);
}

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
  async function submit(e: FormEvent<HTMLFormElement>) {
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

  const groups = groupFields(definition.fields);
  return (
    <AccessibleDialog onClose={onClose} dismissible={!busy} labelledBy="cms-editor-title" describedBy="cms-editor-desc"
      overlayClassName="fixed inset-0 z-[60] flex justify-end bg-ink/45 backdrop-blur-[2px]"
      className="flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl outline-none">
      <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <p className="mb-eyebrow">{definition.title}</p>
          <h2 id="cms-editor-title" className="mt-1 text-xl font-semibold tracking-tight text-foreground">{initial ? `Edit ${definition.singular}` : `Create ${definition.singular}`}</h2>
          <p id="cms-editor-desc" className="mt-1 truncate text-sm text-muted">{initial ? recordLabel(resource, initial) : "Fields marked * are required."}</p>
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close editor" className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-foreground"><X size={20} aria-hidden="true" /></button>
      </div>
      <form onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
          {relationsError && <Notice tone="warning">{relationsError}</Notice>}
          {definition.publishable && <Notice tone="info">Changes are saved as editorial content. Publishing or archiving is a separate action that requires the publisher role; published items need publisher rights to edit.</Notice>}
          {groups.map((group) => <section key={group.key} aria-labelledby={`cms-group-${group.key}`} className="mb-card p-4 sm:p-5">
            <h3 id={`cms-group-${group.key}`} className="text-sm font-semibold text-foreground">{group.title}</h3>
            {group.description && <p className="mt-0.5 text-xs leading-5 text-muted">{group.description}</p>}
            <div className={`mt-4 grid gap-4 ${group.key === "visibility" ? "sm:grid-cols-2" : ""}`}>
              {group.fields.map((field) => renderField(field))}
            </div>
          </section>)}
        </div>
        <div className="border-t border-line bg-surface px-4 py-3 sm:px-7 sm:py-4">
          {error && <Notice tone="danger" className="mb-3">{error}</Notice>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" loading={busy}>{!busy && <Save size={16} aria-hidden="true" />}{busy ? "Saving…" : "Save changes"}</Button>
          </div>
        </div>
      </form>
    </AccessibleDialog>
  );

  function renderField(field: Field) {
    const id = `cms-${field.name}`;
    const hintId = `${id}-hint`;
    const value = values[field.name];
    const hint = field.help ? <p id={hintId} className="text-xs leading-5 text-muted">{field.help}</p> : null;
    const described = field.help ? hintId : undefined;
    const wide = field.type === "textarea" || field.type === "image" || field.type === "boolean";
    if (field.type === "boolean") {
      const locked = field.name === "is_active" && !canPublish;
      return <div key={field.name} className="grid gap-1.5 sm:col-span-full">
        <label htmlFor={id} className={`flex min-h-11 items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-sm font-medium ${locked ? "cursor-not-allowed bg-sunken text-muted" : "cursor-pointer text-foreground hover:border-line-strong"}`}>
          <input id={id} type="checkbox" checked={Boolean(value)} disabled={locked} aria-describedby={described} onChange={(e) => setValue(field.name, e.target.checked)} className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">{field.label}</span>
        </label>
        {hint}
      </div>;
    }
    let control;
    if (field.type === "textarea") {
      control = <Textarea id={id} required={field.required} aria-describedby={described} rows={field.name === "content" || field.name === "answer" ? 10 : 3} value={String(value ?? "")} onChange={(e) => setValue(field.name, e.target.value)} />;
    } else if (field.type === "select") {
      control = <Select id={id} required={field.required} aria-describedby={described} value={String(value ?? field.choices?.[0] ?? "")} onChange={(e) => setValue(field.name, e.target.value)}>{field.choices?.map((opt) => <option key={opt} value={opt}>{opt.replaceAll("_", " ")}</option>)}</Select>;
    } else if (field.type === "relation") {
      control = <Select id={id} required={field.required} aria-describedby={described} value={String(value ?? "")} onChange={(e) => setValue(field.name, e.target.value)}><option value="">{field.required ? "Choose an item" : "None"}</option>{(related[field.relation!] ?? []).filter((row) => !(resource === "navigation-items" && field.name === "parent" && (row.id === initial?.id || row.parent != null))).map((row) => <option key={row.id} value={row.id}>{recordLabel(field.relation!, row)} (#{row.id})</option>)}</Select>;
    } else if (field.type === "image") {
      const chosen = uploads[field.name];
      control = <div className="grid gap-2">
        <input id={id} type="file" accept="image/jpeg,image/png,image/webp" aria-describedby={described} onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && f.size > 8 * 1024 * 1024) { setError("Images must be at most 8 MB."); e.target.value = ""; return; }
          setUploads((old) => ({ ...old, [field.name]: f }));
        }} className="block w-full rounded-xl border border-dashed border-line-strong bg-sunken/60 px-3 py-3 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:border-slate-400" />
        {chosen && <p className="text-xs text-foreground">Selected: <span className="font-medium">{chosen.name}</span></p>}
        {initial && typeof initial[field.name] === "string" && <p className="truncate text-xs text-muted">Current file: {String(initial[field.name])}</p>}
      </div>;
    } else if (field.type === "color") {
      const hex = typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : null;
      control = <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-11 shrink-0 rounded-xl border border-line-strong" style={hex ? { background: hex } : { backgroundImage: "repeating-linear-gradient(45deg,#e4e1da 0 4px,transparent 4px 8px)" }} />
        <Input id={id} type="text" placeholder="#RRGGBB" aria-describedby={described} value={String(value ?? "")} onChange={(e) => setValue(field.name, e.target.value)} className="font-mono" />
      </div>;
    } else {
      control = <Input id={id} type={field.type === "datetime" ? "datetime-local" : field.type === "number" ? "number" : "text"} inputMode={field.type === "number" ? "numeric" : undefined} required={field.required} aria-describedby={described} min={field.type === "number" ? 0 : undefined} value={String(value ?? "")} onChange={(e) => setValue(field.name, field.type === "number" ? Number(e.target.value) : e.target.value)} />;
    }
    return <div key={field.name} className={`grid content-start gap-1.5 ${wide ? "sm:col-span-full" : ""}`}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">{field.label}{field.required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}</label>
      {control}
      {hint}
    </div>;
  }
}
