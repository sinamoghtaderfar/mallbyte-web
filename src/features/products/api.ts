import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";

import type { ProductDetail, ProductListItem } from "./types";

export async function getProducts() {
  const response = await apiClient.get<PaginatedResponse<ProductListItem>>(
    API_ENDPOINTS.products.products,
  );

  return response.data;
}
export async function getProduct(productId: string) {
  const response = await apiClient.get<ProductDetail>(
    `${API_ENDPOINTS.products.products}${productId}/`,
  );

  return response.data;
}
