export type SellerOrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type SellerOrderPaymentStatus =
  "unpaid" | "paid" | "failed" | "refunded";

export type SellerOrderListItem = {
  id: number;
  order_number: string;
  status: SellerOrderStatus;
  status_display: string;
  payment_status: SellerOrderPaymentStatus;
  payment_status_display: string;
  seller_items_count: number;
  seller_total_amount: string;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  seller_status: SellerOrderStatus;
  seller_status_display: string;
};

export type SellerOrderItem = {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  created_at: string;
};

export type SellerOrderStatusHistory = {
  id: number;
  old_status: string;
  new_status: string;
  old_status_display?: string;
  new_status_display?: string;
  changed_by: number | null;
  changed_by_name?: string;
  note: string;
  created_at: string;
};

export type SellerOrderDetail = SellerOrderListItem & {
  receiver_name: string;
  receiver_phone: string;
  province: string;
  city: string;
  address: string;
  postal_code: string;
  customer_note: string;
  cancelled_at: string | null;
  updated_at: string;
  items: SellerOrderItem[];
  status_history: SellerOrderStatusHistory[];
};

export type SellerOrderStatusPayload = {
  status: "processing" | "shipped" | "delivered";
  note?: string;
};
