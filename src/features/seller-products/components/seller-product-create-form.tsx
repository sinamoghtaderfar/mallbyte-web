"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { createSellerProduct, getSellerProductOptions } from "../api";
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

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

export function SellerProductCreateForm() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [categories, setCategories] = useState<SellerProductCategory[]>([]);
  const [brands, setBrands] = useState<SellerProductBrand[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      setIsLoadingOptions(true);
      setError("");

      try {
        const data = await getSellerProductOptions();

        if (isMounted) {
          setCategories(data.categories);
          setBrands(data.brands);
        }
      } catch (optionsError) {
        if (isMounted) {
          setError(getApiErrorMessage(optionsError));
        }
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
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
      await createSellerProduct(mapFormToPayload(form));
      router.push("/seller/products");
    } catch (createError) {
      setError(getApiErrorMessage(createError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            New seller product
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Create product
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Add a new product. It will be submitted for admin approval.
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
              disabled={isLoadingOptions}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 disabled:opacity-60"
            >
              <option value="">
                {isLoadingOptions ? "Loading categories..." : "Select category"}
              </option>

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
              disabled={isLoadingOptions}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 disabled:opacity-60"
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
            disabled={isSubmitting || isLoadingOptions}
            className="h-12 rounded-2xl bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create product"}
          </button>

          <Link
            href="/seller/products"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to products
          </Link>
        </div>
      </form>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Product note</h2>

        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>New products are submitted with pending status.</p>
          <p>Admin approval is needed before customers can buy them.</p>
          <p>Stock will be managed from inventory later.</p>
        </div>
      </aside>
    </div>
  );
}
