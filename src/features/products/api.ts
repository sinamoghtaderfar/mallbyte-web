import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";

import type { ProductListItem } from "./types";

export async function getProducts() {
  const response = await apiClient.get<PaginatedResponse<ProductListItem>>(
    API_ENDPOINTS.products.products,
  );

  return response.data;
}
