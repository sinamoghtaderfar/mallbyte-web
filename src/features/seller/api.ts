import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import type {
  Seller,
  SellerApplicationPayload,
  SellerApplicationResponse,
} from "./types";

export async function applyAsSeller(payload: SellerApplicationPayload) {
  const response = await apiClient.post<SellerApplicationResponse>(
    API_ENDPOINTS.auth.sellerApply,
    payload,
  );

  return response.data;
}

export async function getSellerStatus() {
  const response = await apiClient.get<Seller>(API_ENDPOINTS.auth.sellerStatus);

  return response.data;
}
