import MockAdapter from "axios-mock-adapter";
import { afterEach, expect, it } from "vitest";
import { apiClient } from "@/lib/api/client";
import { updateSellerProduct } from "../api";

const mock = new MockAdapter(apiClient);
afterEach(() => { mock.reset(); });

it("sends a partial PATCH without adding omitted labels or unrelated fields", async () => {
  mock.onPatch("/api/products/products/10/").reply((config) => {
    expect(JSON.parse(config.data)).toEqual({ description: "Updated" });
    return [200, { id: 10, description: "Updated", labels: ["limited"] }];
  });
  expect(await updateSellerProduct("10", { description: "Updated" })).toMatchObject({ labels: ["limited"] });
});
