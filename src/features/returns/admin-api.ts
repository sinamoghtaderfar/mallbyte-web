import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

export type AdminReturnStatus =
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

export type AdminReturnListItem = {
  id: number;
  request_number: string;
  customer: string;
  order: number;
  order_number: string;
  status: AdminReturnStatus;
  reason: string;
  requested_resolution: string;
  refund_method: string;
  total_requested_amount: string;
  total_approved_amount: string;
  created_at: string;
  updated_at: string;
};

export type AdminReturnItem = {
  id: number;
  order_item_id: number;
  product_name: string;
  product_sku: string;
  unit_price: string;
  quantity: number;
  reason: string;
  condition: string;
  status: string;
  customer_note: string;
  inspection_note: string;
  requested_refund_amount: string;
  approved_refund_amount: string;
  created_at: string;
  updated_at: string;
};

export type AdminReturnStatusHistory = {
  id: number;
  old_status: string;
  new_status: string;
  changed_by: string | null;
  note: string;
  created_at: string;
  updated_at: string;
};

export type AdminReturnShipment = {
  id: number;
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  shipping_label: string;
  shipped_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminReturnDetail = AdminReturnListItem & {
  customer_note: string;
  internal_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  closed_at: string | null;
  items: AdminReturnItem[];
  attachments: unknown[];
  shipment: AdminReturnShipment | null;
  status_history: AdminReturnStatusHistory[];
};

type PaginatedAdminReturnsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminReturnListItem[];
};

export async function getAdminReturns() {
  const response = await apiClient.get<
    AdminReturnListItem[] | PaginatedAdminReturnsResponse
  >(API_ENDPOINTS.returns.requests);

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return response.data.results;
}

export async function getAdminReturn(returnId: number | string) {
  const response = await apiClient.get<AdminReturnDetail>(
    API_ENDPOINTS.returns.detail(returnId),
  );

  return response.data;
}

export async function approveAdminReturn(
  returnId: number | string,
  payload: { note?: string; approved_amount?: string },
) {
  const response = await apiClient.post<AdminReturnDetail>(
    API_ENDPOINTS.returns.approve(returnId),
    payload,
  );

  return response.data;
}

export async function rejectAdminReturn(
  returnId: number | string,
  payload: { note?: string },
) {
  const response = await apiClient.post<AdminReturnDetail>(
    API_ENDPOINTS.returns.reject(returnId),
    payload,
  );

  return response.data;
}

export async function markAdminReturnReceived(
  returnId: number | string,
  payload: { note?: string },
) {
  const response = await apiClient.post<AdminReturnDetail>(
    API_ENDPOINTS.returns.markReceived(returnId),
    payload,
  );

  return response.data;
}

export async function markAdminReturnRefunded(
  returnId: number | string,
  payload: { note?: string },
) {
  const response = await apiClient.post<AdminReturnDetail>(
    API_ENDPOINTS.returns.markRefunded(returnId),
    payload,
  );

  return response.data;
}
