"use client";

import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";
import { Check, Circle } from "lucide-react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { controlStyles } from "@/components/ui/input";
import { ProductReferenceFields } from "@/features/products/components/product-reference-fields";

import { getSellerProductOptions } from "../api";

export type ProductFormValues = {
  name: string; description: string; short_description: string; category: string; brand: string;
  price: string; compare_price: string; sku: string; low_stock_threshold: string;
};
type ChangeHandler = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

function TextField({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return <div className="grid content-start gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
    {children}
    {hint && <p id={`${id}-hint`} className="text-xs leading-5 text-muted">{hint}</p>}
  </div>;
}

/** Sectioned seller product fields shared by the create and edit screens. */
export function ProductFormSections({ form, onChange, disabled, categoryLabel, brandLabel }: {
  form: ProductFormValues; onChange: ChangeHandler; disabled: boolean; categoryLabel?: string | null; brandLabel?: string | null;
}) {
  const shortLength = form.short_description.length;
  return <>
    <Card>
      <CardHeader title="Basics" description="What customers see first on the product card and detail page." />
      <div className="mt-5 grid gap-5">
        <TextField id="product-name" label="Product name">
          <input id="product-name" name="name" value={form.name} onChange={onChange} required maxLength={255} className={controlStyles} />
        </TextField>
        <TextField id="product-short-description" label="Short description" hint={`Optional summary for listings · ${shortLength}/500 characters`}>
          <textarea id="product-short-description" name="short_description" value={form.short_description} onChange={onChange} rows={2} maxLength={500}
            aria-describedby="product-short-description-hint" className={`${controlStyles} min-h-20 resize-y`} />
        </TextField>
        <TextField id="product-description" label="Description" hint="Materials, dimensions, care and anything else a buyer needs to decide.">
          <textarea id="product-description" name="description" value={form.description} onChange={onChange} required rows={6}
            aria-describedby="product-description-hint" className={`${controlStyles} min-h-36 resize-y`} />
        </TextField>
      </div>
    </Card>

    <Card>
      <CardHeader title="Classification" description="Category is required; brand is optional. Browse further pages if an option is missing." />
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <ProductReferenceFields category={form.category} brand={form.brand} onChange={onChange}
          loadOptions={getSellerProductOptions} required disabled={disabled}
          categoryLabel={categoryLabel} brandLabel={brandLabel} />
      </div>
    </Card>

    <Card>
      <CardHeader title="Pricing & inventory" description="Amounts are stored as entered; the storefront shows them without inventing a currency." />
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <TextField id="product-price" label="Price">
          <input id="product-price" name="price" type="number" inputMode="decimal" min="0" step="any" value={form.price} onChange={onChange} required className={controlStyles} />
        </TextField>
        <TextField id="product-compare-price" label="Compare price" hint="Optional original price; shown struck through when higher than the price.">
          <input id="product-compare-price" name="compare_price" type="number" inputMode="decimal" min="0" step="any" value={form.compare_price} onChange={onChange}
            aria-describedby="product-compare-price-hint" className={controlStyles} />
        </TextField>
        <TextField id="product-sku" label="SKU" hint="Unique stock keeping unit across the marketplace.">
          <input id="product-sku" name="sku" value={form.sku} onChange={onChange} required maxLength={100} autoCapitalize="characters"
            aria-describedby="product-sku-hint" className={`${controlStyles} font-mono`} />
        </TextField>
        <TextField id="product-low-stock" label="Low stock threshold" hint="You are warned when available stock falls to this level.">
          <input id="product-low-stock" name="low_stock_threshold" type="number" inputMode="numeric" min="0" value={form.low_stock_threshold} onChange={onChange} required
            aria-describedby="product-low-stock-hint" className={controlStyles} />
        </TextField>
      </div>
    </Card>
  </>;
}

/** Sticky publishing summary: completeness checklist, notes and the form actions. */
export function ProductFormAside({ form, title, notes, submitLabel, busyLabel, busy, canSubmit, cancelHref, cancelLabel }: {
  form: ProductFormValues; title: string; notes: string[]; submitLabel: string; busyLabel: string; busy: boolean;
  canSubmit: boolean; cancelHref: string; cancelLabel: string;
}) {
  const checks = [
    { label: "Name", done: Boolean(form.name.trim()) },
    { label: "Description", done: Boolean(form.description.trim()) },
    { label: "Category", done: Boolean(form.category) },
    { label: "Price", done: form.price !== "" },
    { label: "SKU", done: Boolean(form.sku.trim()) },
  ];
  const complete = checks.filter((check) => check.done).length;
  return <aside className="lg:sticky lg:top-24">
    <Card>
      <CardHeader title={title} description={`${complete} of ${checks.length} required details complete`} />
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${(complete / checks.length) * 100}%` }} />
      </div>
      <ul className="mt-4 grid gap-2 text-sm">
        {checks.map((check) => <li key={check.label} className={`flex items-center gap-2 ${check.done ? "text-foreground" : "text-muted"}`}>
          {check.done ? <Check size={15} className="text-success" aria-hidden="true" /> : <Circle size={13} className="text-slate-400" aria-hidden="true" />}
          {check.label}<span className="sr-only">{check.done ? " complete" : " missing"}</span>
        </li>)}
      </ul>
      <ul className="mt-5 grid gap-2 border-t border-line pt-4 text-sm leading-6 text-muted">
        {notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
      <div className="mt-5 grid gap-2">
        <Button type="submit" loading={busy} disabled={!canSubmit}>{busy ? busyLabel : submitLabel}</Button>
        <Link href={cancelHref} className={buttonStyles({ variant: "secondary" })}>{cancelLabel}</Link>
      </div>
    </Card>
  </aside>;
}
