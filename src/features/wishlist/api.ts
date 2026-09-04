import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";

import type { WishlistCreatePayload, WishlistItem } from "./types";

type WishlistListResponse = WishlistItem[] | PaginatedResponse<WishlistItem>;

function normalizeWishlist(data: WishlistListResponse) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.results;
}

export async function getWishlist() {
  const response = await apiClient.get<WishlistListResponse>(
    API_ENDPOINTS.products.wishlist,
  );

  return normalizeWishlist(response.data);
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
