import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getProductReviews } from "../api";

let mock: MockAdapter;
afterEach(() => mock?.restore());

describe("product review pagination contract", () => {
  it("preserves filtered pagination metadata and only requests the selected bounded page", async () => {
    mock = new MockAdapter(apiClient);
    const params = {
      product: 10,
      rating: "5",
      is_verified_purchase: "false",
      page: 2,
      page_size: 20,
    };
    const data = {
      count: 21,
      next: null,
      previous: "https://api.example.test/api/reviews/product-reviews/?page=1",
      results: [{ id: 21 }],
    };
    mock
      .onGet(API_ENDPOINTS.reviews.productReviews, { params })
      .reply(200, data);
    expect(
      await getProductReviews(
        10,
        { rating: "5", is_verified_purchase: "false" },
        2,
      ),
    ).toEqual(data);
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual(params);
  });

  it("retains compatibility with a legacy array response without fetching additional records", async () => {
    mock = new MockAdapter(apiClient);
    mock.onGet(API_ENDPOINTS.reviews.productReviews).reply(200, [{ id: 1 }]);
    expect(await getProductReviews(10)).toEqual({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1 }],
    });
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({
      product: 10,
      page: 1,
      page_size: 20,
    });
  });
});
