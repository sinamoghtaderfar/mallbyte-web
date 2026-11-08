import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getOrders } from "../api";

let mock: MockAdapter;
afterEach(() => mock?.restore());

describe("customer order pagination contract", () => {
  it("requests bounded pages and preserves the complete DRF pagination envelope", async () => {
    mock = new MockAdapter(apiClient);
    const envelope = {
      count: 21,
      next: null,
      previous: "https://api.example.test/api/orders/orders/?page=1",
      results: [{ id: 21 }],
    };
    mock
      .onGet(API_ENDPOINTS.orders.orders, {
        params: { page: 2, page_size: 20 },
      })
      .reply(200, envelope);
    expect(await getOrders(2)).toEqual(envelope);
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].url).toBe(API_ENDPOINTS.orders.orders);
    expect(mock.history.get[0].params).toEqual({ page: 2, page_size: 20 });
  });
});
