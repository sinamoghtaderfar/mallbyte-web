"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getProductFilters, getProducts } from "../api";
import type {
  ProductBrand,
  ProductCategory,
  ProductListItem,
  ProductQueryParams,
} from "../types";
import { ProductCard } from "./product-card";

type FilterFormState = {
  search: string;
  category: string;
  brand: string;
  min_price: string;
  max_price: string;
  in_stock: boolean;
  has_discount: boolean;
  label: string;
  ordering: string;
};

const emptyFilters: FilterFormState = {
  search: "",
  category: "",
  brand: "",
  min_price: "",
  max_price: "",
  in_stock: false,
  has_discount: false,
  label: "",
  ordering: "",
};

const productLabels = [
  { value: "new", label: "New" },
  { value: "bestseller", label: "Bestseller" },
  { value: "discounted", label: "Discounted" },
  { value: "limited", label: "Limited Edition" },
  { value: "preorder", label: "Pre-order" },
];

const orderingOptions = [
  { value: "", label: "Newest first" },
  { value: "price", label: "Price: low to high" },
  { value: "-price", label: "Price: high to low" },
  { value: "-views_count", label: "Most viewed" },
  { value: "-created_at", label: "Newest" },
];

function buildProductQueryParams(filters: FilterFormState): ProductQueryParams {
  const params: ProductQueryParams = {};

  if (filters.search.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.category) {
    params.category = filters.category;
  }

  if (filters.brand) {
    params.brand = filters.brand;
  }

  if (filters.min_price.trim()) {
    params.min_price = filters.min_price.trim();
  }

  if (filters.max_price.trim()) {
    params.max_price = filters.max_price.trim();
  }

  if (filters.in_stock) {
    params.in_stock = "true";
  }

  if (filters.has_discount) {
    params.has_discount = "true";
  }

  if (filters.label) {
    params.label = filters.label;
  }

  if (filters.ordering) {
    params.ordering = filters.ordering;
  }

  return params;
}

export function ProductList() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [draftFilters, setDraftFilters] =
    useState<FilterFormState>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<ProductQueryParams>({});
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFilters() {
      setIsLoadingFilters(true);
      setFilterError("");

      try {
        const data = await getProductFilters();

        if (isMounted) {
          setCategories(data.categories);
          setBrands(data.brands);
        }
      } catch (loadError) {
        if (isMounted) {
          setFilterError(getApiErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoadingFilters(false);
        }
      }
    }

    void loadFilters();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setIsLoadingProducts(true);
      setError("");

      try {
        const data = await getProducts(appliedFilters);

        if (isMounted) {
          setProducts(data.results);
          setResultCount(data.count);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, [appliedFilters]);

  function handleFilterChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, type, value } = event.target;
    const nextValue =
      type === "checkbox" ? (event.target as HTMLInputElement).checked : value;

    setDraftFilters((current) => ({
      ...current,
      [name]: nextValue,
    }));
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(buildProductQueryParams(draftFilters));
  }

  function handleClearFilters() {
    setDraftFilters(emptyFilters);
    setAppliedFilters({});
  }

  const hasAppliedFilters = Object.keys(appliedFilters).length > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Filters
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Find products
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Search and filter the catalog by category, brand, price, stock, and
            labels.
          </p>
        </div>

        {filterError ? (
          <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {filterError}
          </div>
        ) : null}

        <form onSubmit={handleFilterSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Search products
            </span>
            <input
              name="search"
              value={draftFilters.search}
              onChange={handleFilterChange}
              placeholder="Keyboard, mouse, ..."
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <select
              name="category"
              value={draftFilters.category}
              onChange={handleFilterChange}
              disabled={isLoadingFilters}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 disabled:opacity-60"
            >
              <option value="">All categories</option>

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
              value={draftFilters.brand}
              onChange={handleFilterChange}
              disabled={isLoadingFilters}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 disabled:opacity-60"
            >
              <option value="">All brands</option>

              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Min price
              </span>
              <input
                name="min_price"
                type="number"
                min="0"
                value={draftFilters.min_price}
                onChange={handleFilterChange}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Max price
              </span>
              <input
                name="max_price"
                type="number"
                min="0"
                value={draftFilters.max_price}
                onChange={handleFilterChange}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Label</span>
            <select
              name="label"
              value={draftFilters.label}
              onChange={handleFilterChange}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">Any label</option>

              {productLabels.map((label) => (
                <option key={label.value} value={label.value}>
                  {label.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Sort by</span>
            <select
              name="ordering"
              value={draftFilters.ordering}
              onChange={handleFilterChange}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
            >
              {orderingOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                name="in_stock"
                type="checkbox"
                checked={draftFilters.in_stock}
                onChange={handleFilterChange}
                className="h-4 w-4 rounded border-slate-300"
              />
              In stock only
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                name="has_discount"
                type="checkbox"
                checked={draftFilters.has_discount}
                onChange={handleFilterChange}
                className="h-4 w-4 rounded border-slate-300"
              />
              Has discount
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Apply filters
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </form>
      </aside>

      <section>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Catalog
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Products
            </h1>
          </div>

          {resultCount !== null ? (
            <p className="text-sm text-slate-500">
              {resultCount} product{resultCount === 1 ? "" : "s"} found
            </p>
          ) : null}
        </div>

        {hasAppliedFilters ? (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Filters are active. Use Clear to reset the catalog.
          </div>
        ) : null}

        {isLoadingProducts ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">Loading products...</p>
          </div>
        ) : null}

        {!isLoadingProducts && error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-red-800">
              Could not load products
            </h2>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        ) : null}

        {!isLoadingProducts && !error && !products.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              {hasAppliedFilters
                ? "No products match your filters"
                : "No products yet"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {hasAppliedFilters
                ? "Try changing or clearing the current filters."
                : "Products will appear here once they are available from the backend."}
            </p>
          </div>
        ) : null}

        {!isLoadingProducts && !error && products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
