import MockAdapter from "axios-mock-adapter";
import { afterEach, expect, it } from "vitest";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getSellerProducts } from "../api";

const mock = new MockAdapter(apiClient);
afterEach(() => mock.reset());

it("preserves the seller page envelope and requests only the selected bounded page", async () => {
  const page = { count: 21, next: null, previous: "?page=1", results: [{ id: 21 }] };
  mock.onGet(API_ENDPOINTS.products.myProducts).reply(200, page);
  expect(await getSellerProducts(2)).toEqual(page);
  expect(mock.history.get).toHaveLength(1);
  expect(mock.history.get[0].params).toEqual({ page: 2, page_size: 20 });
});
