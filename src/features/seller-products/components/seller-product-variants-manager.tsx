"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import type { ProductVariant } from "@/features/products/types";
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

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Product variants
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Manage variants
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Add different versions of the same product, such as size, color, or
          switch type.
        </p>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Variant name
          </span>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Red Switch"
            className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">SKU</span>
          <input
            name="sku"
            value={form.sku}
            onChange={handleChange}
            required
            placeholder="KB-RED-001"
            className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Price</span>
          <input
            name="price"
            type="number"
            min="0"
            value={form.price}
            onChange={handleChange}
            required
            className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Compare price
          </span>
          <input
            name="compare_price"
            type="number"
            min="0"
            value={form.compare_price}
            onChange={handleChange}
            className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Stock</span>
          <input
            name="stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={handleChange}
            required
            className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          />
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            name="is_default"
            type="checkbox"
            checked={form.is_default}
            onChange={handleChange}
            className="h-4 w-4 rounded border-slate-300"
          />
          Default variant
        </label>

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving..."
              : editingVariantId
                ? "Save variant"
                : "Create variant"}
          </button>

          {editingVariantId ? (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading product variants...</p>
        ) : null}

        {!isLoading && !variants.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-6">
            <h3 className="text-lg font-semibold text-slate-950">
              No variants yet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Create the first product variant.
            </p>
          </div>
        ) : null}

        {variants.length ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="grid grid-cols-[1fr_120px_100px_160px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              <span>Variant</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-slate-100">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="grid grid-cols-[1fr_120px_100px_160px] gap-4 px-5 py-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">
                        {variant.name}
                      </p>

                      {variant.is_default ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Default
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      SKU: {variant.sku}
                    </p>
                  </div>

                  <p className="text-sm font-medium text-slate-900">
                    {formatPrice(variant.final_price || variant.price)}
                  </p>

                  <p className="text-sm text-slate-600">{variant.stock}</p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditVariant(variant)}
                      className="h-9 rounded-2xl border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteVariant(variant.id)}
                      disabled={deletingVariantId === variant.id}
                      className="h-9 rounded-2xl border border-red-200 px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingVariantId === variant.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
