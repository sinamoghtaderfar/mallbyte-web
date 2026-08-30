"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import type { ProductDetail } from "@/features/products/types";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  getSellerProduct,
  getSellerProductOptions,
  updateSellerProduct,
} from "../api";
import type {
  SellerProductBrand,
  SellerProductCategory,
  SellerProductPayload,
} from "../types";

type FormState = {
  name: string;
  description: string;
  short_description: string;
  price: string;
  compare_price: string;
  cost_per_item: string;
  category: string;
  brand: string;
  sku: string;
  low_stock_threshold: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  barcode: string;
};

const initialForm: FormState = {
  name: "",
  description: "",
  short_description: "",
  price: "",
  compare_price: "",
  cost_per_item: "",
  category: "",
  brand: "",
  sku: "",
  low_stock_threshold: "5",
  weight: "",
  length: "",
  width: "",
  height: "",
  barcode: "",
};

function nullableToString(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapProductToForm(product: ProductDetail): FormState {
  return {
    name: product.name,
    description: product.description,
    short_description: product.short_description ?? "",
    price: product.price,
    compare_price: nullableToString(product.compare_price),
    cost_per_item: nullableToString(product.cost_per_item),
    category: product.category ? String(product.category) : "",
    brand: product.brand ? String(product.brand) : "",
    sku: product.sku,
    low_stock_threshold: String(product.low_stock_threshold),
    weight: nullableToString(product.weight),
    length: nullableToString(product.length),
    width: nullableToString(product.width),
    height: nullableToString(product.height),
    barcode: nullableToString(product.barcode),
  };
}

function mapFormToPayload(form: FormState): SellerProductPayload {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    short_description: form.short_description.trim(),
    price: form.price.trim(),
    compare_price: emptyToNull(form.compare_price),
    cost_per_item: emptyToNull(form.cost_per_item),
    category: Number(form.category),
    brand: form.brand ? Number(form.brand) : null,
    sku: form.sku.trim(),
    low_stock_threshold: Number(form.low_stock_threshold || 5),
    weight: emptyToNull(form.weight),
    length: emptyToNull(form.length),
    width: emptyToNull(form.width),
    height: emptyToNull(form.height),
    barcode: emptyToNull(form.barcode),
    labels: [],
  };
}

export function SellerProductEditForm() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [categories, setCategories] = useState<SellerProductCategory[]>([]);
  const [brands, setBrands] = useState<SellerProductBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEditData() {
      setIsLoading(true);
      setError("");

      try {
        const [product, options] = await Promise.all([
          getSellerProduct(productId),
          getSellerProductOptions(),
        ]);

        if (!isMounted) {
          return;
        }

        setForm(mapProductToForm(product));
        setCategories(options.categories);
        setBrands(options.brands);
      } catch (editError) {
        if (isMounted) {
          setError(getApiErrorMessage(editError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadEditData();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      await updateSellerProduct(productId, mapFormToPayload(form));
      router.push(`/seller/products/${productId}`);
    } catch (updateError) {
      setError(getApiErrorMessage(updateError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading product edit form...</p>
      </div>
    );
  }

  if (error && !form.name) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load product edit form
        </h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>

        <Link
          href="/seller/products"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Edit seller product
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Update product
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Update product information. Admin approval may still be required.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Product name
            </span>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              maxLength={255}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Description
            </span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Short description
            </span>
            <textarea
              name="short_description"
              value={form.short_description}
              onChange={handleChange}
              rows={3}
              maxLength={500}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">Select category</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Brand</span>
            <select
              name="brand"
              value={form.brand}
              onChange={handleChange}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">No brand</option>

              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
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
            <span className="text-sm font-medium text-slate-700">SKU</span>
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              required
              maxLength={100}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Low stock threshold
            </span>
            <input
              name="low_stock_threshold"
              type="number"
              min="0"
              value={form.low_stock_threshold}
              onChange={handleChange}
              required
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 rounded-2xl bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save product"}
          </button>

          <Link
            href={`/seller/products/${productId}`}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to product
          </Link>
        </div>
      </form>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Edit note</h2>

        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>Changing core product details can require approval again later.</p>
          <p>Images, variants, and inventory will be added in later steps.</p>
        </div>
      </aside>
    </div>
  );
}
