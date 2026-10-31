import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getSellerProducts } from "../api";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn() },
}));

describe("seller product API routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the seller-scoped endpoint rather than the public catalog", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ id: 10, name: "Pending seller product" }],
    });

    const products = await getSellerProducts();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.products.myProducts);
    expect(apiClient.get).not.toHaveBeenCalledWith(API_ENDPOINTS.products.products);
    expect(products).toHaveLength(1);
  });

  it("normalizes a paginated seller response", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { count: 1, next: null, previous: null, results: [{ id: 11 }] },
    });

    const products = await getSellerProducts();
    expect(products).toEqual([{ id: 11 }]);
  });
});
