import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import type {
  Seller,
  SellerApplicationPayload,
  SellerApplicationResponse,
  SellerStore,
  SellerStorePayload,
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

export async function getSellerDashboard() {
  const response = await apiClient.get<Seller>(
    API_ENDPOINTS.auth.sellerDashboard,
  );

  return response.data;
}

export async function getSellerStore() {
  const response = await apiClient.get<SellerStore>(
    API_ENDPOINTS.auth.sellerStore,
  );

  return response.data;
}

export async function updateSellerStore(payload: SellerStorePayload) {
  const formData = new FormData();

  formData.append("description", payload.description);
  formData.append("business_phone", payload.business_phone);
  formData.append("business_email", payload.business_email);
  formData.append("website", payload.website);
  formData.append("bank_info", JSON.stringify(payload.bank_info));

  const response = await apiClient.patch<SellerStore>(
    API_ENDPOINTS.auth.sellerStore,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}
