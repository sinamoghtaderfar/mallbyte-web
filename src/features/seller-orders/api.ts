import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import type {
  SellerOrderDetail,
  SellerOrderListItem,
  SellerOrderStatusPayload,
} from "./types";

export async function getSellerOrders() {
  const response = await apiClient.get<SellerOrderListItem[]>(
    API_ENDPOINTS.sellerOrders.orders,
  );

  return response.data;
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
