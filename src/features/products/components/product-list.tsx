"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { ArrowLeft, ArrowRight, PackageSearch, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { controlStyles, Select } from "@/components/ui/input";
import { Notice } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

import { getProductFilters, getProducts } from "../api";
import type { ProductListItem, ProductQueryParams } from "../types";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { ProductReferenceFields } from "./product-reference-fields";
import { getCatalogUrlSnapshot, getServerCatalogUrlSnapshot, navigateCatalog, parseCatalogUrlState, subscribeCatalogUrl } from "../url-state";

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

function toFilterForm(params: ProductQueryParams): FilterFormState {
  return {
    search: params.search ?? "", category: params.category ?? "", brand: params.brand ?? "",
    min_price: params.min_price ?? "", max_price: params.max_price ?? "",
    in_stock: params.in_stock === "true", has_discount: params.has_discount === "true",
    label: params.label ?? "", ordering: params.ordering ?? "",
  };
}

export function ProductList() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const urlSearch = useSyncExternalStore(subscribeCatalogUrl, getCatalogUrlSnapshot, getServerCatalogUrlSnapshot);
  const urlState = useMemo(() => parseCatalogUrlState(urlSearch), [urlSearch]);
  const { filters: appliedFilters, page, pageSize } = urlState;
  const [editedFilters, setEditedFilters] = useState<FilterFormState | null>(null);
  const draftFilters = editedFilters ?? toFilterForm(appliedFilters);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setIsLoadingProducts(true);
      setError("");

      try {
        const data = await getProducts({ ...appliedFilters, ...(page > 1 ? { page: String(page) } : {}), ...(pageSize !== 20 ? { page_size: String(pageSize) } : {}) });

        if (isMounted) {
          setProducts(data.results);
          setResultCount(data.count);
          setHasNextPage(Boolean(data.next));
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
  }, [urlSearch]);

  function handleFilterChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, type, value } = event.target;
    const nextValue =
      type === "checkbox" ? (event.target as HTMLInputElement).checked : value;

    setEditedFilters((current) => ({
      ...(current ?? toFilterForm(appliedFilters)),
      [name]: nextValue,
    }));
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      draftFilters.min_price &&
      draftFilters.max_price &&
      Number(draftFilters.min_price) > Number(draftFilters.max_price)
    ) {
      setError("Minimum price cannot exceed maximum price.");
      return;
    }
    navigateCatalog({
      filters: buildProductQueryParams(draftFilters),
      page: 1,
      pageSize,
    });
    setEditedFilters(null);
  }

  function handleClearFilters() {
    navigateCatalog({ filters: {}, page: 1, pageSize });
    setEditedFilters(null);
  }

  const hasAppliedFilters = Object.keys(appliedFilters).length > 0;
  const totalPages = resultCount !== null ? Math.max(1, Math.ceil(resultCount / pageSize)) : 1;
  const filterLabels: Record<string, string> = {
    search: "Search", category: "Category", brand: "Brand", min_price: "Min price", max_price: "Max price",
    in_stock: "In stock", has_discount: "On sale", label: "Label", ordering: "Sort",
  };
  function describeFilter(key: keyof ProductQueryParams, value: string) {
    if (key === "in_stock" || key === "has_discount" || key === "category" || key === "brand") return filterLabels[key];
    if (key === "ordering") return `Sort: ${orderingOptions.find((o) => o.value === value)?.label ?? value}`;
    if (key === "label") return `Label: ${productLabels.find((l) => l.value === value)?.label ?? value}`;
    return `${filterLabels[key] ?? key}: ${value}`;
  }
  function removeFilter(key: keyof ProductQueryParams) {
    const next = { ...appliedFilters };
    delete next[key];
    navigateCatalog({ filters: next, page: 1, pageSize });
    setEditedFilters(null);
  }
  function handleSortChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = { ...draftFilters, ordering: event.target.value };
    if (next.min_price && next.max_price && Number(next.min_price) > Number(next.max_price)) {
      setEditedFilters(next);
      return;
    }
    navigateCatalog({ filters: buildProductQueryParams(next), page: 1, pageSize });
    setEditedFilters(null);
  }
  const fieldLabel = "text-sm font-medium text-slate-800";
  const checkRow = "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100";

  return (
    <div>
      <header className="border-b border-line pb-8">
        <div className="max-w-2xl">
          <p className="mb-eyebrow">The marketplace</p>
          <h1 className="mb-display mt-3 text-[2.75rem] text-foreground sm:text-[3.75rem]">
            {appliedFilters.search ? <>Results for <span className="italic">“{appliedFilters.search}”</span></> : "Products"}
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-7 text-muted">
            Considered goods from independent sellers. Filter by category, brand, price and availability.
          </p>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="secondary" className="rounded-full lg:hidden" aria-expanded={filtersOpen} aria-controls="catalog-filter-panel" onClick={() => setFiltersOpen((v) => !v)}>
          <SlidersHorizontal size={16} aria-hidden="true" />{filtersOpen ? "Hide filters" : "Filters"}
          {hasAppliedFilters ? <span className="rounded-full bg-ink px-1.5 text-xs leading-5 text-white">{Object.keys(appliedFilters).length}</span> : null}
        </Button>
        {resultCount !== null ? (
          <p className="order-last w-full text-sm text-muted sm:order-none sm:w-auto" aria-live="polite">
            {resultCount} product{resultCount === 1 ? "" : "s"} found
          </p>
        ) : null}
        <div className="ml-auto flex items-center gap-3">
          <label htmlFor="catalog-sort" className="sr-only sm:not-sr-only sm:whitespace-nowrap sm:text-sm sm:text-muted">Sort by</label>
          <Select id="catalog-sort" name="ordering" form="catalog-filters" value={draftFilters.ordering} onChange={handleSortChange} className="w-44 rounded-full bg-surface sm:w-52">
            {orderingOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {hasAppliedFilters ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>Filters are active:</span>
          {(Object.entries(appliedFilters) as [keyof ProductQueryParams, string][]).map(([key, value]) => (
            <span key={key} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line-strong/80 bg-surface py-0.5 pl-3 pr-1 text-[0.8125rem] font-medium text-slate-800">
              {describeFilter(key, value)}
              <button type="button" onClick={() => removeFilter(key)} aria-label={`Remove ${describeFilter(key, value)} filter`} className="flex size-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-ink">
                <X size={13} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-12">
        <aside id="catalog-filter-panel" className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
          <form id="catalog-filters" onSubmit={handleFilterSubmit} className="space-y-6 rounded-2xl border border-line bg-surface p-5 shadow-sm lg:sticky lg:top-36 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <h2 className="sr-only">Filter products</h2>
            <label className="block">
              <span className={fieldLabel}>Search products</span>
              <input
                name="search"
                value={draftFilters.search}
                onChange={handleFilterChange}
                placeholder="Lamp, backpack, …"
                className={`mt-1.5 ${controlStyles}`}
              />
            </label>

            <div className="space-y-5 border-t border-line pt-5">
              <ProductReferenceFields
                category={draftFilters.category}
                brand={draftFilters.brand}
                onChange={handleFilterChange}
                loadOptions={getProductFilters}
              />
            </div>

            <div role="group" aria-labelledby="catalog-price-range" className="border-t border-line pt-5">
              <p id="catalog-price-range" className={`${fieldLabel} mb-1.5`}>Price range</p>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="text-xs text-muted">Min price</span>
                  <input
                    name="min_price"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={draftFilters.min_price}
                    onChange={handleFilterChange}
                    placeholder="0"
                    className={`mt-1 ${controlStyles}`}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Max price</span>
                  <input
                    name="max_price"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={draftFilters.max_price}
                    onChange={handleFilterChange}
                    placeholder="Any"
                    className={`mt-1 ${controlStyles}`}
                  />
                </label>
              </div>
            </div>

            <label className="block border-t border-line pt-5">
              <span className={fieldLabel}>Label</span>
              <Select
                name="label"
                value={draftFilters.label}
                onChange={handleFilterChange}
                className="mt-1.5"
              >
                <option value="">Any label</option>

                {productLabels.map((label) => (
                  <option key={label.value} value={label.value}>
                    {label.label}
                  </option>
                ))}
              </Select>
            </label>

            <div className="-mx-3 space-y-0.5 border-t border-line pt-4">
              <label className={checkRow}>
                In stock only
                <input
                  name="in_stock"
                  type="checkbox"
                  checked={draftFilters.in_stock}
                  onChange={handleFilterChange}
                  className="size-4.5 rounded border-slate-300"
                />
              </label>

              <label className={checkRow}>
                Has discount
                <input
                  name="has_discount"
                  type="checkbox"
                  checked={draftFilters.has_discount}
                  onChange={handleFilterChange}
                  className="size-4.5 rounded border-slate-300"
                />
              </label>
            </div>

            <div className="flex gap-2 border-t border-line pt-5">
              <Button type="submit" className="flex-1">
                Apply filters
              </Button>

              <Button variant="secondary" onClick={handleClearFilters}>
                Clear
              </Button>
            </div>
          </form>
        </aside>

        <section aria-label="Product results" className="min-w-0">

          {isLoadingProducts ? (
            <div role="status">
              <span className="sr-only">Loading products...</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: Math.min(pageSize, 9) }, (_, index) => <ProductCardSkeleton key={index} />)}
              </div>
            </div>
          ) : null}

          {!isLoadingProducts && error ? (
            <Notice tone="danger" title="Could not load products" className="p-5">
              <p>{error}</p>
            </Notice>
          ) : null}

          {!isLoadingProducts && !error && !products.length ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 py-20 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600" aria-hidden="true"><PackageSearch size={24} strokeWidth={1.6} /></span>
              <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">
                {hasAppliedFilters
                  ? "No products match your filters"
                  : "No products yet"}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {hasAppliedFilters
                  ? "Try changing or clearing the current filters."
                  : "Products will appear here once they are available from the backend."}
              </p>
            </div>
          ) : null}

          {!isLoadingProducts && !error && products.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 2xl:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 3} />
              ))}
            </div>
          ) : null}
          {!error && resultCount !== null && resultCount > 0 ? (
            <nav aria-label="Product pagination" className="mt-14 flex flex-col items-center gap-4 border-t border-line pt-8 sm:flex-row sm:justify-between">
              <span className="text-sm text-muted">Page {page} of {totalPages} · {resultCount} products</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <label htmlFor="catalog-page-size" className="text-sm text-muted">Per page</label>
                <Select id="catalog-page-size" value={pageSize} onChange={(event) => navigateCatalog({ filters: appliedFilters, page: 1, pageSize: Number(event.target.value) as 12 | 20 | 40 })} className="w-20 rounded-full">
                  <option value={12}>12</option><option value={20}>20</option><option value={40}>40</option>
                </Select>
                <Button variant="secondary" className="rounded-full" disabled={isLoadingProducts || page <= 1} onClick={() => navigateCatalog({ filters: appliedFilters, page: Math.max(1, page - 1), pageSize })}><ArrowLeft size={16} aria-hidden="true" />Previous</Button>
                <Button className="rounded-full" disabled={isLoadingProducts || !hasNextPage} onClick={() => navigateCatalog({ filters: appliedFilters, page: page + 1, pageSize })}>Next<ArrowRight size={16} aria-hidden="true" /></Button>
              </div>
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}
