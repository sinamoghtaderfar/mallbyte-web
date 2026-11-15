import MockAdapter from "axios-mock-adapter";
import { afterAll, afterEach, expect, it } from "vitest";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getAdminReturns } from "../admin-api";
import { page, records } from "./pagination-fixtures";
const mock = new MockAdapter(apiClient);
afterEach(() => mock.reset());
afterAll(() => mock.restore());
it("preserves the backend return envelope and requests one bounded page", async () => {
  const result = page(records.slice(20), 21, null, "?page=1");
  mock.onGet(API_ENDPOINTS.returns.requests).reply(200, result);
  expect(await getAdminReturns(2)).toEqual(result);
  expect(mock.history.get[0].params).toEqual({ page: 2, page_size: 20 });
});
it("normalizes a legacy array without requesting further pages", async () => {
  mock.onGet(API_ENDPOINTS.returns.requests).reply(200, []);
  expect(await getAdminReturns()).toEqual({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  expect(mock.history.get).toHaveLength(1);
});
