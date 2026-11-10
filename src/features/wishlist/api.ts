import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";

import type { WishlistCreatePayload, WishlistItem } from "./types";

type WishlistListResponse = WishlistItem[] | PaginatedResponse<WishlistItem>;

export async function getWishlistPage(
  page = 1,
  signal?: AbortSignal,
): Promise<PaginatedResponse<WishlistItem>> {
  const response = await apiClient.get<WishlistListResponse>(
    API_ENDPOINTS.products.wishlist,
    { params: { page, page_size: 20 }, signal },
  );
  return Array.isArray(response.data)
    ? {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      }
    : response.data;
}

export async function addToWishlist(payload: WishlistCreatePayload) {
  const response = await apiClient.post<WishlistItem>(
    API_ENDPOINTS.products.wishlist,
    payload,
  );

  return response.data;
}

export async function removeWishlistItem(wishlistItemId: number | string) {
  await apiClient.delete(API_ENDPOINTS.products.wishlistItem(wishlistItemId));
}
