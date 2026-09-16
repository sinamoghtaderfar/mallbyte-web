import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

export type SellerReturnStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "waiting_for_item"
  | "item_received"
  | "inspecting"
  | "refund_pending"
  | "refunded"
  | "replaced"
  | "cancelled"
  | "closed";

export type SellerReturnUser = {
  id: number;
  email: string;
  full_name: string;
};

export type SellerReturnListItem = {
  id: number;
  request_number: string;
  customer: string | number | SellerReturnUser;
  order: number;
  order_number: string;
  status: SellerReturnStatus;
  reason: string;
  requested_resolution: string;
  refund_method: string;
  total_requested_amount: string;
  total_approved_amount: string;
  created_at: string;
  updated_at: string;
};

export type SellerReturnItem = {
  id: number;
  order_item_id?: number;
  product_name: string;
  product_sku: string;
  unit_price: string;
  quantity: number;
  reason: string;
  condition: string;
  status: string;
  customer_note: string;
  inspection_note?: string;
  requested_refund_amount: string;
  approved_refund_amount: string;
  created_at: string;
  updated_at: string;
};

export type SellerReturnStatusHistory = {
  id: number;
  old_status: string;
  new_status: string;
  changed_by: string | null;
  note: string;
  created_at: string;
  updated_at: string;
};

export type SellerReturnDetail = SellerReturnListItem & {
  customer_note?: string;
  internal_note?: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  closed_at: string | null;
  items: SellerReturnItem[];
  attachments: unknown[];
  status_history: SellerReturnStatusHistory[];
};

type PaginatedSellerReturnsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: SellerReturnListItem[];
};

function normalizeSellerReturnsResponse(
  data: SellerReturnListItem[] | PaginatedSellerReturnsResponse,
) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.results;
}

export async function getSellerReturns() {
  const response = await apiClient.get<
    SellerReturnListItem[] | PaginatedSellerReturnsResponse
  >(API_ENDPOINTS.returns.sellerRequests);

  return normalizeSellerReturnsResponse(response.data);
}

export async function getSellerReturn(returnId: number | string) {
  const response = await apiClient.get<SellerReturnDetail>(
    API_ENDPOINTS.returns.sellerDetail(returnId),
  );

  return response.data;
}
