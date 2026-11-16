import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";

import type {
  SellerOrderDetail,
  SellerOrderListItem,
  SellerOrderStatusPayload,
} from "./types";

export async function getSellerOrders(page = 1, signal?: AbortSignal) {
  const response = await apiClient.get<SellerOrderListItem[] | PaginatedResponse<SellerOrderListItem>>(
    API_ENDPOINTS.sellerOrders.orders,
    { params: { page, page_size: 20 }, signal },
  );

  return Array.isArray(response.data)
    ? { count: response.data.length, next: null, previous: null, results: response.data }
    : response.data;
}

export async function getSellerOrder(orderId: number | string) {
  const response = await apiClient.get<SellerOrderDetail>(
    API_ENDPOINTS.sellerOrders.detail(orderId),
  );

  return response.data;
}

export async function updateSellerOrderStatus(
  orderId: number | string,
  payload: SellerOrderStatusPayload,
) {
  const response = await apiClient.post<SellerOrderDetail>(
    API_ENDPOINTS.sellerOrders.updateStatus(orderId),
    payload,
  );

  return response.data;
}
