import type { ProductQueryParams } from "./types";

export type CatalogUrlState = {
  filters: ProductQueryParams;
  page: number;
  pageSize: 12 | 20 | 40;
};

const FILTER_KEYS = [
  "search", "category", "brand", "min_price", "max_price",
  "in_stock", "has_discount", "label", "ordering",
] as const;

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value || !/^[1-9]\d*$/.test(value)) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number <= 10000 ? number : fallback;
}

/** Parse only supported catalog parameters; avoid leaking unrelated URL state to the API. */
export function parseCatalogUrlState(search: string): CatalogUrlState {
  const query = new URLSearchParams(search);
  const filters: ProductQueryParams = {};
  for (const key of FILTER_KEYS) {
    const value = query.get(key)?.trim();
    if (!value) continue;
    if (key === "in_stock" || key === "has_discount") {
      if (value === "true") filters[key] = "true";
    } else {
      filters[key] = value;
    }
  }
  const requestedSize = parsePositiveInt(query.get("page_size"), 20);
  const pageSize = (requestedSize === 12 || requestedSize === 40 ? requestedSize : 20);
  return {
    filters,
    page: parsePositiveInt(query.get("page"), 1),
    pageSize,
  };
}

export function buildCatalogUrlSearch(state: CatalogUrlState) {
  const query = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = state.filters[key];
    if (value) query.set(key, value);
  }
  if (state.page > 1) query.set("page", String(state.page));
  if (state.pageSize !== 20) query.set("page_size", String(state.pageSize));
  return query.toString();
}

/** Native History API works with Next App Router and browser Back/Forward. */
export function navigateCatalog(state: CatalogUrlState) {
  const search = buildCatalogUrlSearch(state);
  const url = window.location.pathname + (search ? `?${search}` : "") + window.location.hash;
  if (url !== window.location.pathname + window.location.search + window.location.hash) {
    window.history.pushState(null, "", url);
    window.dispatchEvent(new Event("catalog-url-change"));
  }
}

export function subscribeCatalogUrl(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener("catalog-url-change", listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener("catalog-url-change", listener);
  };
}

export function getCatalogUrlSnapshot() {
  return window.location.search;
}

export function getServerCatalogUrlSnapshot() {
  return "";
}
