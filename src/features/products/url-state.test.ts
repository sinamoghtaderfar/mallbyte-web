import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCatalogUrlSearch, navigateCatalog, parseCatalogUrlState } from "./url-state";

describe("catalog URL state", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/products");
  });

  it("parses supported filters, page and page size", () => {
    const state = parseCatalogUrlState("?search=keyboard&category=3&in_stock=true&page=2&page_size=12&extra=ignored");
    expect(state).toEqual({
      filters: { search: "keyboard", category: "3", in_stock: "true" },
      page: 2,
      pageSize: 12,
    });
  });

  it("rejects invalid pagination values and boolean values", () => {
    expect(parseCatalogUrlState("?page=-8&page_size=400&has_discount=maybe")).toEqual({
      filters: {}, page: 1, pageSize: 20,
    });
  });

  it("round-trips shareable filter links", () => {
    const state = { filters: { search: "red shoes", ordering: "-price" }, page: 3, pageSize: 40 as const };
    const parsed = parseCatalogUrlState("?" + buildCatalogUrlSearch(state));
    expect(parsed).toEqual(state);
  });

  it("updates the browser URL and notifies subscribers", () => {
    const handler = vi.fn();
    window.addEventListener("catalog-url-change", handler);
    navigateCatalog({ filters: { search: "mouse" }, page: 2, pageSize: 20 });
    expect(window.location.search).toBe("?search=mouse&page=2");
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("catalog-url-change", handler);
  });
});
