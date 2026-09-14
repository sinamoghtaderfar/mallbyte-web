export type ReturnStatus =
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

export type ReturnReason =
  | "damaged"
  | "wrong_item"
  | "defective"
  | "not_as_described"
  | "size_or_fit"
  | "changed_mind"
  | "late_delivery"
  | "other";

export type RequestedResolution =
  "refund" | "replacement" | "store_credit" | "repair" | "other";

export type RefundMethod =
  "original_payment" | "store_credit" | "manual" | "none";

export type ReturnItemCondition =
  "new" | "opened" | "used" | "damaged" | "unknown";

export type ReturnListItem = {
  id: number;
  request_number: string;
  customer: string;
  order: number;
  order_number: string;
  status: ReturnStatus;
  reason: ReturnReason;
  requested_resolution: RequestedResolution;
  refund_method: RefundMethod;
  total_requested_amount: string;
  total_approved_amount: string;
  created_at: string;
  updated_at: string;
};

export type ReturnItem = {
  id: number;
  order_item_id: number;
  product_name: string;
  product_sku: string;
  unit_price: string;
  quantity: number;
  reason: ReturnReason;
  condition: ReturnItemCondition;
  status: string;
  customer_note: string;
  inspection_note: string;
  requested_refund_amount: string;
  approved_refund_amount: string;
  created_at: string;
  updated_at: string;
};

export type ReturnStatusHistory = {
  id: number;
  old_status: string;
  new_status: string;
  changed_by: string | null;
  note: string;
  created_at: string;
  updated_at: string;
};

export type ReturnAttachment = {
  id: number;
  return_item: number | null;
  uploaded_by: string;
  attachment_type: string;
  file: string;
  caption: string;
  created_at: string;
  updated_at: string;
};

export type ReturnShipment = {
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

export type ReturnDetail = ReturnListItem & {
  customer_note: string;
  internal_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  closed_at: string | null;
  items: ReturnItem[];
  attachments: ReturnAttachment[];
  shipment: ReturnShipment | null;
  status_history: ReturnStatusHistory[];
};

export type CreateReturnItemPayload = {
  order_item: number;
  quantity: number;
  reason?: ReturnReason;
  condition?: ReturnItemCondition;
  customer_note?: string;
};

export type CreateReturnPayload = {
  order: number;
  reason: ReturnReason;
  requested_resolution: RequestedResolution;
  refund_method: RefundMethod;
  customer_note?: string;
  items: CreateReturnItemPayload[];
};

export type ReturnActionPayload = {
  note?: string;
};
