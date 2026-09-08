import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";

import type {
  ProductReview,
  ProductReviewFilters,
  ProductReviewPayload,
  ProductReviewSummary,
} from "./types";

type ListResponse<T> = T[] | PaginatedResponse<T>;

function normalizeList<T>(data: ListResponse<T>) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.results;
}

export async function getProductReviews(
  productId: number | string,
  filters: ProductReviewFilters = {},
) {
  const response = await apiClient.get<ListResponse<ProductReview>>(
    API_ENDPOINTS.reviews.productReviews,
    {
      params: {
        product: productId,
        ...filters,
      },
    },
  );

  return normalizeList(response.data);
}

export async function getProductReviewSummary(productId: number | string) {
  const response = await apiClient.get<ProductReviewSummary>(
    API_ENDPOINTS.reviews.productReviewsSummary,
    {
      params: {
        product: productId,
      },
    },
  );

  return response.data;
}

export async function createProductReview(payload: ProductReviewPayload) {
  const response = await apiClient.post<ProductReview>(
    API_ENDPOINTS.reviews.productReviews,
    payload,
  );

  return response.data;
}

export async function markReviewHelpful(reviewId: number | string) {
  const response = await apiClient.post<ProductReview>(
    API_ENDPOINTS.reviews.productReviewHelpful(reviewId),
  );

  return response.data;
}

export async function markReviewNotHelpful(reviewId: number | string) {
  const response = await apiClient.post<ProductReview>(
    API_ENDPOINTS.reviews.productReviewNotHelpful(reviewId),
  );

  return response.data;
}
