"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { getApiErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { getProductFilters, getProducts } from "../api";
import type { ProductListItem, ProductQueryParams } from "../types";
import { ProductCard } from "./product-card";
import { ProductReferenceFields } from "./product-reference-fields";
import {
  getCatalogUrlSnapshot,
  getServerCatalogUrlSnapshot,
  navigateCatalog,
  parseCatalogUrlState,
  subscribeCatalogUrl,
} from "../url-state";

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
    search: params.search ?? "",
    category: params.category ?? "",
    brand: params.brand ?? "",
    min_price: params.min_price ?? "",
    max_price: params.max_price ?? "",
    in_stock: params.in_stock === "true",
    has_discount: params.has_discount === "true",
    label: params.label ?? "",
    ordering: params.ordering ?? "",
  };
}

export function ProductList() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const urlSearch = useSyncExternalStore(
    subscribeCatalogUrl,
    getCatalogUrlSnapshot,
    getServerCatalogUrlSnapshot,
  );
  const urlState = useMemo(() => parseCatalogUrlState(urlSearch), [urlSearch]);
  const { filters: appliedFilters, page, pageSize } = urlState;
  const [editedFilters, setEditedFilters] = useState<FilterFormState | null>(
    null,
  );
  const draftFilters = editedFilters ?? toFilterForm(appliedFilters);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const {
      filters: queryFilters,
      page: queryPage,
      pageSize: queryPageSize,
    } = parseCatalogUrlState(urlSearch);
    let isMounted = true;

    async function loadProducts() {
      setIsLoadingProducts(true);
      setError("");

      try {
        const data = await getProducts({
          ...queryFilters,
          ...(queryPage > 1 ? { page: String(queryPage) } : {}),
          ...(queryPageSize !== 20 ? { page_size: String(queryPageSize) } : {}),
        });

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
  }, [urlSearch, retry]);

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
    setFilterError("");
    if (
      draftFilters.min_price &&
      draftFilters.max_price &&
      Number(draftFilters.min_price) > Number(draftFilters.max_price)
    ) {
      setFilterError("Minimum price cannot exceed maximum price.");
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
    setFilterError("");
    navigateCatalog({ filters: {}, page: 1, pageSize });
    setEditedFilters(null);
  }

  const hasAppliedFilters = Object.keys(appliedFilters).length > 0;
  const activeFilters = [
    appliedFilters.search ? `Search: ${appliedFilters.search}` : "",
    appliedFilters.category ? "Category selected" : "",
    appliedFilters.brand ? "Brand selected" : "",
    appliedFilters.min_price ? `Min: ${appliedFilters.min_price}` : "",
    appliedFilters.max_price ? `Max: ${appliedFilters.max_price}` : "",
    appliedFilters.label
      ? (productLabels.find((label) => label.value === appliedFilters.label)
          ?.label ?? appliedFilters.label)
      : "",
    appliedFilters.ordering
      ? (orderingOptions.find(
          (option) => option.value === appliedFilters.ordering,
        )?.label ?? "Custom sort")
      : "",
    appliedFilters.in_stock ? "In stock" : "",
    appliedFilters.has_discount ? "Discounted" : "",
  ].filter(Boolean);

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            The marketplace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Products
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
            Find something that fits your everyday. Explore products from
            independent sellers.
          </p>
        </div>
        <p aria-live="polite" className="text-sm tabular-nums text-muted">
          {resultCount !== null
            ? `${resultCount} product${resultCount === 1 ? "" : "s"} found`
            : "Finding products…"}
        </p>
      </div>
      <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
        <Button
          variant="secondary"
          aria-controls="catalog-filters"
          aria-expanded={filtersOpen}
          aria-label={filtersOpen ? "Hide filters" : "Show filters"}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          Filters{activeFilters.length > 0 ? ` (${activeFilters.length})` : ""}
          {filtersOpen ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </Button>
        <span className="text-xs text-muted">Search, sort & refine</span>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
        <aside
          id="catalog-filters"
          className={`${filtersOpen ? "block" : "hidden"} min-w-0 rounded-xl border border-line bg-surface p-5 lg:block`}
        >
          <h2
            id="catalog-filter-heading"
            className="text-base font-semibold text-foreground"
          >
            Refine your search
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Make it yours. Choose what matters to you.
          </p>
          <form
            aria-labelledby="catalog-filter-heading"
            onSubmit={handleFilterSubmit}
            className="mt-5 space-y-5"
          >
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Search products
              </span>
              <div className="relative mt-2">
                <Search
                  size={17}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-3.5 text-muted"
                />
                <Input
                  name="search"
                  value={draftFilters.search}
                  onChange={handleFilterChange}
                  placeholder="What are you looking for?"
                  className="pl-10"
                />
              </div>
            </label>
            <ProductReferenceFields
              category={draftFilters.category}
              brand={draftFilters.brand}
              onChange={handleFilterChange}
              loadOptions={getProductFilters}
            />
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-foreground">
                Price range
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted">Min price</span>
                  <Input
                    name="min_price"
                    aria-invalid={Boolean(filterError)}
                    aria-describedby={
                      filterError ? "catalog-price-error" : undefined
                    }
                    type="number"
                    min="0"
                    value={draftFilters.min_price}
                    onChange={handleFilterChange}
                    className="mt-1.5"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Max price</span>
                  <Input
                    name="max_price"
                    aria-invalid={Boolean(filterError)}
                    aria-describedby={
                      filterError ? "catalog-price-error" : undefined
                    }
                    type="number"
                    min="0"
                    value={draftFilters.max_price}
                    onChange={handleFilterChange}
                    className="mt-1.5"
                  />
                </label>
              </div>
            </fieldset>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Label</span>
              <Select
                name="label"
                value={draftFilters.label}
                onChange={handleFilterChange}
                className="mt-2"
              >
                <option value="">Any label</option>
                {productLabels.map((label) => (
                  <option key={label.value} value={label.value}>
                    {label.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Sort by
              </span>
              <Select
                name="ordering"
                value={draftFilters.ordering}
                onChange={handleFilterChange}
                className="mt-2"
              >
                {orderingOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
            <fieldset className="border-t border-line pt-2">
              <legend className="sr-only">Availability and offers</legend>
              <label className="flex min-h-11 items-center gap-3 text-sm text-foreground">
                <input
                  name="in_stock"
                  type="checkbox"
                  checked={draftFilters.in_stock}
                  onChange={handleFilterChange}
                  className="size-4"
                />
                In stock only
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm text-foreground">
                <input
                  name="has_discount"
                  type="checkbox"
                  checked={draftFilters.has_discount}
                  onChange={handleFilterChange}
                  className="size-4"
                />
                Has discount
              </label>
            </fieldset>
            {filterError && (
              <p
                id="catalog-price-error"
                role="alert"
                className="text-sm leading-6 text-danger"
              >
                {filterError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Apply filters</Button>
              <Button variant="secondary" onClick={handleClearFilters}>
                Clear
              </Button>
            </div>
          </form>
        </aside>
        <section aria-label="Product results" className="min-w-0">
          {hasAppliedFilters && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="sr-only">
                Filters are active. Use Clear to reset the catalog.
              </span>
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="max-w-full break-words rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-muted"
                >
                  {filter}
                </span>
              ))}
              <Button variant="quiet" size="small" onClick={handleClearFilters}>
                Reset results
              </Button>
            </div>
          )}
          {isLoadingProducts && (
            <div role="status">
              <span className="sr-only">Loading products...</span>
              <div
                aria-hidden="true"
                className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3"
              >
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-xl border border-line bg-surface"
                  >
                    <div className="aspect-square animate-pulse bg-slate-100" />
                    <div className="space-y-3 p-4">
                      <div className="h-4 w-3/4 rounded bg-slate-100" />
                      <div className="h-3 w-1/2 rounded bg-slate-100" />
                      <div className="h-4 w-1/3 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!isLoadingProducts && error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-6 sm:p-8"
            >
              <h2 className="text-lg font-semibold text-danger">
                Could not load products
              </h2>
              <p className="mt-2 break-words text-sm leading-6 text-danger">
                {error}
              </p>
              <Button
                variant="secondary"
                className="mt-5"
                onClick={() => setRetry((value) => value + 1)}
              >
                Retry products
              </Button>
            </div>
          )}
          {!isLoadingProducts && !error && !products.length && (
            <div className="rounded-xl border border-line bg-surface px-5 py-14 text-center sm:px-8">
              <Search
                size={30}
                strokeWidth={1.5}
                aria-hidden="true"
                className="mx-auto text-brand"
              />
              <h2 className="mt-5 text-xl font-semibold text-foreground">
                {hasAppliedFilters
                  ? "No products match your filters"
                  : "No products yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                {hasAppliedFilters
                  ? "Try changing or clearing the current filters."
                  : "New discoveries are on their way. Check back soon to explore the collection."}
              </p>
            </div>
          )}
          {!isLoadingProducts && !error && products.length > 0 && (
            <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-5 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          {!error && resultCount !== null && resultCount > 0 && (
            <nav
              aria-label="Product pagination"
              className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"
            >
              <span className="text-xs tabular-nums text-muted sm:text-sm">
                Page {page} of {Math.max(1, Math.ceil(resultCount / pageSize))}{" "}
                · {resultCount} products
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="catalog-page-size"
                  className="text-xs text-muted"
                >
                  Per page
                </label>
                <div className="w-20">
                  <Select
                    id="catalog-page-size"
                    value={pageSize}
                    onChange={(event) =>
                      navigateCatalog({
                        filters: appliedFilters,
                        page: 1,
                        pageSize: Number(event.target.value) as 12 | 20 | 40,
                      })
                    }
                  >
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                    <option value={40}>40</option>
                  </Select>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  disabled={isLoadingProducts || page <= 1}
                  onClick={() =>
                    navigateCatalog({
                      filters: appliedFilters,
                      page: Math.max(1, page - 1),
                      pageSize,
                    })
                  }
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  disabled={isLoadingProducts || !hasNextPage}
                  onClick={() =>
                    navigateCatalog({
                      filters: appliedFilters,
                      page: page + 1,
                      pageSize,
                    })
                  }
                >
                  Next
                </Button>
              </div>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
