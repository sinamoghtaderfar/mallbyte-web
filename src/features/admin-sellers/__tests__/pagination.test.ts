import MockAdapter from "axios-mock-adapter";
import { afterEach, expect, it } from "vitest";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getAdminPendingSellers, getAdminSellers } from "../api";
import { makeSeller } from "./fixtures";
const mock = new MockAdapter(apiClient);
afterEach(() => mock.reset());
it("preserves seller envelopes and submits supported status and bounded page parameters", async () => {
  const data = {
    count: 21,
    next: "?page=2",
    previous: null,
    results: Array.from({ length: 20 }, (_, i) => makeSeller({ id: i + 1 })),
  };
  mock.onGet(API_ENDPOINTS.auth.adminSellers).reply(200, data);
  expect(await getAdminSellers(1, "pending")).toEqual(data);
  expect(mock.history.get[0].params).toEqual({
    page: 1,
    page_size: 20,
    status: "pending",
  });
});
it("preserves pending-seller pagination and accepts legacy arrays", async () => {
  const data = {
    count: 21,
    next: null,
    previous: "?page=1",
    results: [makeSeller({ id: 21 })],
  };
  mock
    .onGet(API_ENDPOINTS.auth.adminPendingSellers)
    .replyOnce(200, data)
    .onGet(API_ENDPOINTS.auth.adminPendingSellers)
    .reply(200, []);
  expect(await getAdminPendingSellers(2)).toEqual(data);
  expect(mock.history.get[0].params).toEqual({ page: 2, page_size: 20 });
  expect(await getAdminPendingSellers()).toEqual({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
});
