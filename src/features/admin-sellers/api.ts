import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

export type AdminSellerStatus =
  "pending" | "approved" | "rejected" | "suspended";

export type AdminSellerUser = {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  is_seller: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  email_verified: boolean;
};

export type AdminSeller = {
  id: number;
  user: number | string | AdminSellerUser;
  user_email?: string;
  user_full_name?: string;
  business_name?: string;
  store_name?: string;
  business_email: string;
  business_phone?: string;
  phone?: string;
  status: AdminSellerStatus;
  commission_rate: string;
  total_sales: string;
  total_orders: number;
  balance: string;
  verified_at: string | null;
  rejected_at?: string | null;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
};

type PaginatedAdminSellersResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminSeller[];
};

type SellerModerationResponse = {
  message: string;
  seller: AdminSeller;
};

function normalizeSellersResponse(
  data: AdminSeller[] | PaginatedAdminSellersResponse,
): PaginatedAdminSellersResponse {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }

  return data;
}

export async function getAdminSellers(
  page = 1,
  status?: AdminSellerStatus,
  signal?: AbortSignal,
) {
  const response = await apiClient.get<
    AdminSeller[] | PaginatedAdminSellersResponse
  >(API_ENDPOINTS.auth.adminSellers, {
    params: { page, page_size: 20, ...(status ? { status } : {}) },
    signal,
  });

  return normalizeSellersResponse(response.data);
}

export async function getAdminPendingSellers(page = 1, signal?: AbortSignal) {
  const response = await apiClient.get<
    AdminSeller[] | PaginatedAdminSellersResponse
  >(API_ENDPOINTS.auth.adminPendingSellers, {
    params: { page, page_size: 20 },
    signal,
  });

  return normalizeSellersResponse(response.data);
}

export async function getAdminSeller(sellerId: number | string) {
  const response = await apiClient.get<AdminSeller>(
    API_ENDPOINTS.auth.adminSellerDetail(sellerId),
  );

  return response.data;
}

export async function verifyAdminSeller(sellerId: number | string) {
  const response = await apiClient.post<SellerModerationResponse>(
    API_ENDPOINTS.auth.adminSellerVerify(sellerId),
  );

  return response.data.seller;
}

export async function rejectAdminSeller(
  sellerId: number | string,
  payload: { reason: string },
) {
  const reason = payload.reason.trim();
  const response = await apiClient.post<SellerModerationResponse>(
    API_ENDPOINTS.auth.adminSellerReject(sellerId),
    { reason },
  );

  // SellerSerializer currently omits the saved reason. Preserve the submitted
  // explanation for the completed review without overriding a server value.
  return {
    ...response.data.seller,
    rejection_reason: response.data.seller.rejection_reason ?? reason,
  };
}
