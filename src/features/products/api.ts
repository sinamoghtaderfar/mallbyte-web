import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";

import type {
  ProductBrand,
  ProductCategory,
  ProductDetail,
  ProductListItem,
  ProductQueryParams,
  RecentlyViewedProduct,
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

export async function trackProductView(productId: string) {
  const response = await apiClient.post<{ views_count: number }>(
    API_ENDPOINTS.products.productAddView(productId),
  );

  return response.data;
}

export async function getRelatedProducts(productId: string) {
  const response = await apiClient.get<ListResponse<ProductListItem>>(
    API_ENDPOINTS.products.productRelated(productId),
  );

  return normalizeList(response.data);
}

export async function getRecentlyViewedProducts() {
  const response = await apiClient.get<ListResponse<RecentlyViewedProduct>>(
    API_ENDPOINTS.products.recentlyViewed,
  );

  return normalizeList(response.data);
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
