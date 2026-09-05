import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";

import type {
  ProductBrand,
  ProductCategory,
  ProductDetail,
  ProductListItem,
  ProductQueryParams,
} from "./types";

type ListResponse<T> = T[] | PaginatedResponse<T>;

function normalizeList<T>(data: ListResponse<T>) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.results;
}

export async function getProducts(params: ProductQueryParams = {}) {
  const response = await apiClient.get<PaginatedResponse<ProductListItem>>(
    API_ENDPOINTS.products.products,
    {
      params,
    },
  );

  return response.data;
}

export async function getProduct(productId: string) {
  const response = await apiClient.get<ProductDetail>(
    `${API_ENDPOINTS.products.products}${productId}/`,
  );

  return response.data;
}

export async function getProductFilters() {
  const [categoriesResponse, brandsResponse] = await Promise.all([
    apiClient.get<ListResponse<ProductCategory>>(
      API_ENDPOINTS.products.categories,
    ),
    apiClient.get<ListResponse<ProductBrand>>(API_ENDPOINTS.products.brands),
  ]);

  return {
    categories: normalizeList(categoriesResponse.data),
    brands: normalizeList(brandsResponse.data),
  };
}
