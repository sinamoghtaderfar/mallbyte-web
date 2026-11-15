import MockAdapter from "axios-mock-adapter";
import { afterEach, expect, it } from "vitest";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getEligibleShipmentOrders } from "../api";

const mock = new MockAdapter(apiClient);
afterEach(() => mock.reset());

it("retains the eligible order envelope and requests one bounded selected page", async () => {
  const page = { count: 21, next: null, previous: "?page=1", results: [{ id: 21 }] };
  mock.onGet(API_ENDPOINTS.shipping.eligibleOrders).reply(200, page);
  expect(await getEligibleShipmentOrders(2)).toEqual(page);
  expect(mock.history.get).toHaveLength(1);
  expect(mock.history.get[0].params).toEqual({ page: 2, page_size: 20 });
});
