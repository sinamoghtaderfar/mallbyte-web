import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { ProductListItem } from "@/features/products/types";
import type { PaginatedResponse } from "@/types/api";

import type {
  SellerProductBrand,
  SellerProductCategory,
  SellerProductCreateResponse,
  SellerProductPayload,
} from "./types";

type ListResponse<T> = T[] | PaginatedResponse<T>;

function normalizeList<T>(data: ListResponse<T>) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.results;
}

export async function getSellerProducts() {
  const response = await apiClient.get<ListResponse<ProductListItem>>(
    API_ENDPOINTS.products.products,
  );

  return normalizeList(response.data);
}

export async function getSellerProductOptions() {
  const [categoriesResponse, brandsResponse] = await Promise.all([
    apiClient.get<ListResponse<SellerProductCategory>>(
      API_ENDPOINTS.products.categories,
    ),
    apiClient.get<ListResponse<SellerProductBrand>>(
      API_ENDPOINTS.products.brands,
    ),
  ]);

  return {
    categories: normalizeList(categoriesResponse.data),
    brands: normalizeList(brandsResponse.data),
  };
}

export async function createSellerProduct(payload: SellerProductPayload) {
  const response = await apiClient.post<SellerProductCreateResponse>(
    API_ENDPOINTS.products.products,
    payload,
  );

  return response.data;
}
