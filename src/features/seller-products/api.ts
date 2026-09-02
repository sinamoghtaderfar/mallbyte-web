import type { ProductDetail, ProductListItem } from "@/features/products/types";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
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

export async function getSellerProduct(productId: string) {
  const response = await apiClient.get<ProductDetail>(
    `${API_ENDPOINTS.products.products}${productId}/`,
  );

  return response.data;
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

export async function updateSellerProduct(
  productId: string,
  payload: SellerProductPayload,
) {
  const response = await apiClient.patch<ProductDetail>(
    `${API_ENDPOINTS.products.products}${productId}/`,
    payload,
  );

  return response.data;
}

export async function deleteSellerProduct(productId: string) {
  await apiClient.delete(`${API_ENDPOINTS.products.products}${productId}/`);
}

export type SellerProductImagePayload = {
  file: File;
  alt_text: string;
  is_main: boolean;
  order: number;
};

export async function getSellerProductImages(productId: string) {
  const product = await getSellerProduct(productId);

  return product.images;
}

export async function createSellerProductImage(
  productId: string,
  payload: SellerProductImagePayload,
) {
  const formData = new FormData();

  formData.append("product", productId);
  formData.append("image", payload.file);
  formData.append("alt_text", payload.alt_text);
  formData.append("is_main", String(payload.is_main));
  formData.append("order", String(payload.order));

  const response = await apiClient.post(
    API_ENDPOINTS.products.productImages,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function deleteSellerProductImage(imageId: number | string) {
  await apiClient.delete(API_ENDPOINTS.products.productImageDetail(imageId));
}
