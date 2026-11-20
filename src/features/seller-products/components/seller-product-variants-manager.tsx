"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import type { ProductVariant } from "@/features/products/types";
import { Layers, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { controlStyles } from "@/components/ui/input";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  createSellerProductVariant,
  deleteSellerProductVariant,
  getSellerProductVariants,
  updateSellerProductVariant,
} from "../api";
import type { SellerProductVariantPayload } from "../types";

type SellerProductVariantsManagerProps = {
  productId: number | string;
};

type FormState = {
  name: string;
  sku: string;
  price: string;
  compare_price: string;
  stock: string;
  is_default: boolean;
};

const initialForm: FormState = {
  name: "",
  sku: "",
  price: "",
  compare_price: "",
  stock: "0",
  is_default: false,
};

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapFormToPayload(form: FormState): SellerProductVariantPayload {
  return {
    name: form.name.trim(),
    sku: form.sku.trim(),
    price: form.price.trim(),
    compare_price: emptyToNull(form.compare_price),
    stock: Number(form.stock || 0),
    is_default: form.is_default,
  };
}

function mapVariantToForm(variant: ProductVariant): FormState {
  return {
    name: variant.name,
    sku: variant.sku,
    price: variant.price,
    compare_price: variant.compare_price ?? "",
    stock: String(variant.stock),
    is_default: variant.is_default,
  };
}

function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "0";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function SellerProductVariantsManager({
  productId,
}: SellerProductVariantsManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<number | null>(
    null,
  );
  const [error, setError] = useState("");

  async function loadVariants() {
    setError("");

    const data = await getSellerProductVariants(String(productId));
    setVariants(data);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialVariants() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getSellerProductVariants(String(productId));

        if (isMounted) {
          setVariants(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialVariants();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleEditVariant(variant: ProductVariant) {
    setEditingVariantId(variant.id);
    setForm(mapVariantToForm(variant));
    setError("");
  }

  function handleCancelEdit() {
    setEditingVariantId(null);
    setForm(initialForm);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const payload = mapFormToPayload(form);

      if (editingVariantId) {
        await updateSellerProductVariant(editingVariantId, payload);
      } else {
        await createSellerProductVariant(String(productId), payload);
      }

      setEditingVariantId(null);
      setForm(initialForm);

      await loadVariants();
    } catch (variantError) {
      setError(getApiErrorMessage(variantError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteVariant(variantId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this variant?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingVariantId(variantId);

    try {
      await deleteSellerProductVariant(variantId);
      await loadVariants();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setDeletingVariantId(null);
    }
  }

  const fieldId = (name: string) => `variant-${productId}-${name}`;

  return (
    <Card>
      <CardHeader eyebrow="Product variants" title="Manage variants"
        description="Add different versions of the same product, such as size, color, or switch type." />

      {error ? <Notice tone="danger" className="mt-5">{error}</Notice> : null}

      <form onSubmit={handleSubmit} className={`mt-5 grid gap-4 rounded-xl border p-4 sm:grid-cols-2 ${editingVariantId ? "border-ember-200 bg-ember-50/50" : "border-dashed border-line-strong bg-sunken/40"}`}>
        <p className="text-sm font-semibold text-foreground sm:col-span-2">{editingVariantId ? "Edit variant" : "Add a variant"}</p>
        <div className="grid gap-1.5">
          <label htmlFor={fieldId("name")} className="text-sm font-medium text-foreground">Variant name</label>
          <input id={fieldId("name")} name="name" value={form.name} onChange={handleChange} required placeholder="Red Switch" className={controlStyles} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={fieldId("sku")} className="text-sm font-medium text-foreground">SKU</label>
          <input id={fieldId("sku")} name="sku" value={form.sku} onChange={handleChange} required placeholder="KB-RED-001" className={`${controlStyles} font-mono`} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={fieldId("price")} className="text-sm font-medium text-foreground">Price</label>
          <input id={fieldId("price")} name="price" type="number" inputMode="decimal" min="0" step="any" value={form.price} onChange={handleChange} required className={controlStyles} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={fieldId("compare")} className="text-sm font-medium text-foreground">Compare price</label>
          <input id={fieldId("compare")} name="compare_price" type="number" inputMode="decimal" min="0" step="any" value={form.compare_price} onChange={handleChange} className={controlStyles} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={fieldId("stock")} className="text-sm font-medium text-foreground">Stock</label>
          <input id={fieldId("stock")} name="stock" type="number" inputMode="numeric" min="0" value={form.stock} onChange={handleChange} required className={controlStyles} />
        </div>
        <label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium text-foreground">
          <input name="is_default" type="checkbox" checked={form.is_default} onChange={handleChange} className="size-4" />
          Default variant
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>
            {!isSubmitting && !editingVariantId && <Plus size={15} aria-hidden="true" />}
            {isSubmitting ? "Saving..." : editingVariantId ? "Save variant" : "Create variant"}
          </Button>
          {editingVariantId ? <Button variant="secondary" onClick={handleCancelEdit}>Cancel edit</Button> : null}
        </div>
      </form>

      <div className="mt-6" aria-live="polite">
        {isLoading ? (
          <div role="status" className="grid gap-2">
            <span className="sr-only">Loading product variants...</span>
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : null}

        {!isLoading && !variants.length ? (
          <EmptyState className="py-10" icon={<Layers size={22} />} title="No variants yet" description="Create the first product variant." />
        ) : null}

        {variants.length ? (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="mb-table min-w-[36rem]">
              <caption className="sr-only">Product variants</caption>
              <thead><tr><th scope="col">Variant</th><th scope="col" className="text-right">Price</th><th scope="col" className="text-right">Stock</th><th scope="col" className="text-right">Actions</th></tr></thead>
              <tbody>
                {variants.map((variant) => (
                  <tr key={variant.id} className={editingVariantId === variant.id ? "[&>td]:!bg-ember-50/60" : ""}>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{variant.name}</span>
                        {variant.is_default ? <Badge tone="success">Default</Badge> : null}
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-muted">SKU: {variant.sku}</p>
                    </td>
                    <td className="text-right font-medium text-foreground">{formatPrice(variant.final_price || variant.price)}</td>
                    <td className={`text-right ${variant.stock <= 0 ? "font-medium text-danger" : "text-slate-700"}`}>{variant.stock}{variant.stock <= 0 && <span className="sr-only"> (out of stock)</span>}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <Button size="small" variant="secondary" onClick={() => handleEditVariant(variant)}>Edit</Button>
                        <Button size="small" variant="quiet" onClick={() => void handleDeleteVariant(variant.id)} loading={deletingVariantId === variant.id}
                          className="text-rose-700 hover:bg-rose-50 hover:text-rose-800">
                          {deletingVariantId === variant.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
