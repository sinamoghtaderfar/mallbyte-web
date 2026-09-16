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
  phone: string;
  status: AdminSellerStatus;
  commission_rate: string;
  total_sales: string;
  total_orders: number;
  balance: string;
  verified_at: string | null;
  rejected_at?: string | null;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
};

type PaginatedAdminSellersResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminSeller[];
};

function normalizeSellersResponse(
  data: AdminSeller[] | PaginatedAdminSellersResponse,
) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.results;
}

export async function getAdminSellers() {
  const response = await apiClient.get<
    AdminSeller[] | PaginatedAdminSellersResponse
  >(API_ENDPOINTS.auth.adminSellers);

  return normalizeSellersResponse(response.data);
}

export async function getAdminPendingSellers() {
  const response = await apiClient.get<
    AdminSeller[] | PaginatedAdminSellersResponse
  >(API_ENDPOINTS.auth.adminPendingSellers);

  return normalizeSellersResponse(response.data);
}

export async function getAdminSeller(sellerId: number | string) {
  const response = await apiClient.get<AdminSeller>(
    API_ENDPOINTS.auth.adminSellerDetail(sellerId),
  );

  return response.data;
}

export async function verifyAdminSeller(sellerId: number | string) {
  const response = await apiClient.post<AdminSeller>(
    API_ENDPOINTS.auth.adminSellerVerify(sellerId),
  );

  return response.data;
}

export async function rejectAdminSeller(
  sellerId: number | string,
  payload: { rejection_reason: string },
) {
  const response = await apiClient.post<AdminSeller>(
    API_ENDPOINTS.auth.adminSellerReject(sellerId),
    payload,
  );

  return response.data;
}
