import { AxiosError } from "axios";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";

import type {
  ProductBrand,
  ProductCategory,
  ProductDetail,
  ProductListItem,
  ProductQueryParams,
  ProductReferenceQuery,
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
  try {
    const response = await apiClient.get<ListResponse<ProductListItem>>(
      API_ENDPOINTS.products.productRelated(productId),
    );

    return normalizeList(response.data);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return [];
    }

    throw error;
  }
}

export async function getRecentlyViewedProducts() {
  const response = await apiClient.get<ListResponse<RecentlyViewedProduct>>(
    API_ENDPOINTS.products.recentlyViewed,
  );

  return normalizeList(response.data);
}

export async function getProductFilters(
  { categoryPage = 1, brandPage = 1 }: ProductReferenceQuery = {},
  signal?: AbortSignal,
) {
  const [categoriesResponse, brandsResponse] = await Promise.all([
    apiClient.get<ListResponse<ProductCategory>>(
      API_ENDPOINTS.products.categories,
      { params: { page: categoryPage, page_size: 20 }, signal },
    ),
    apiClient.get<ListResponse<ProductBrand>>(API_ENDPOINTS.products.brands, {
      params: { page: brandPage, page_size: 20 },
      signal,
    }),
  ]);

  return {
    categories: referencePage(categoriesResponse.data),
    brands: referencePage(brandsResponse.data),
  };
}

export function referencePage<T>(data: ListResponse<T>): PaginatedResponse<T> {
  return Array.isArray(data)
    ? { count: data.length, next: null, previous: null, results: data }
    : data;
}
