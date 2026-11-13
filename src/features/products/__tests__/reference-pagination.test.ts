import MockAdapter from "axios-mock-adapter";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getProductFilters } from "../api";
import { getSellerProductOptions } from "@/features/seller-products/api";

const mock = new MockAdapter(apiClient);
beforeEach(() => mock.reset());
afterAll(() => mock.restore());

describe("product reference pagination", () => {
  it("preserves metadata for more than twenty categories and brands", async () => {
    const results = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Reference ${i + 1}`,
    }));
    const page = { count: 21, next: "?page=2", previous: null, results };
    mock.onGet(API_ENDPOINTS.products.categories).reply(200, page);
    mock.onGet(API_ENDPOINTS.products.brands).reply(200, page);
    const response = await getProductFilters();
    expect(response.categories).toEqual(page);
    expect(response.brands).toEqual(page);
  });
  it.each([getProductFilters, getSellerProductOptions])("requests independent bounded pages and retains the backend envelope", async (loadOptions) => {
    const categories = { count: 21, next: null, previous: "?page=1", results: [{ id: 21, name: "Last category" }] };
    const brands = { count: 21, next: "?page=2", previous: null, results: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Brand ${i + 1}` })) };
    mock.onGet(API_ENDPOINTS.products.categories, { params: { page: 2, page_size: 20 } }).reply(200, categories);
    mock.onGet(API_ENDPOINTS.products.brands, { params: { page: 1, page_size: 20 } }).reply(200, brands);
    expect(await loadOptions({ categoryPage: 2, brandPage: 1 })).toEqual({ categories, brands });
    expect(mock.history.get).toHaveLength(2);
  });

});
