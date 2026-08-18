import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";

import type { CheckoutPayload, OrderDetail, OrderListItem } from "./types";

export async function checkout(payload: CheckoutPayload) {
  const response = await apiClient.post<OrderDetail>(
    API_ENDPOINTS.orders.checkout,
    payload,
  );

  return response.data;
}

export async function getOrders() {
  const response = await apiClient.get<PaginatedResponse<OrderListItem>>(
    API_ENDPOINTS.orders.orders,
  );

  return response.data;
}

export async function getOrder(orderId: string) {
  const response = await apiClient.get<OrderDetail>(
    `${API_ENDPOINTS.orders.orders}${orderId}/`,
  );

  return response.data;
}
