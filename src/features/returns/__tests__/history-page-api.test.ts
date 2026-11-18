import MockAdapter from "axios-mock-adapter";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getReturnsPage } from "../api";
const mock = new MockAdapter(apiClient);
beforeEach(() => mock.reset());
afterAll(() => mock.restore());
describe("bounded return history API", () => {
  it("preserves the real backend envelope and requests only one20-record page", async () => {
    const data = { count: 21, next: "?page=2", previous: null, results: Array.from({ length: 20 }, (_, index) => ({ id: index + 1, order: index + 1 })) };
    mock.onGet(API_ENDPOINTS.returns.requests, { params: { page: 1, page_size: 20 } }).reply(200, data);
    expect(await getReturnsPage()).toEqual(data);
    expect(mock.history.get).toHaveLength(1);
  });
});
