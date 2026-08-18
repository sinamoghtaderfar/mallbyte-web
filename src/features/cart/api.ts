import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import type { AddToCartPayload, Cart, UpdateCartItemPayload } from "./types";

export async function getCart() {
  const response = await apiClient.get<Cart>(API_ENDPOINTS.orders.cart);

  return response.data;
}

export async function addToCart(payload: AddToCartPayload) {
  const response = await apiClient.post<Cart>(
    API_ENDPOINTS.orders.cartAdd,
    payload,
  );

  return response.data;
}

export async function updateCartItem(
  itemId: number,
  payload: UpdateCartItemPayload,
) {
  const response = await apiClient.patch<Cart>(
    API_ENDPOINTS.orders.cartItem(itemId),
    payload,
  );

  return response.data;
}

export async function removeCartItem(itemId: number) {
  const response = await apiClient.delete<Cart>(
    API_ENDPOINTS.orders.cartItem(itemId),
  );

  return response.data;
}

export async function clearCart() {
  await apiClient.delete(API_ENDPOINTS.orders.cartClear);
}
