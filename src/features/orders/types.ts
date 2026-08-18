export type OrderListItem = {
  id: number;
  order_number: string;
  status: string;
  status_display: string;
  payment_status: string;
  payment_status_display: string;
  items_count: number;
  total_amount: string;
  created_at: string;
};

export type OrderItem = {
  id: number;
  product: number;
  product_id: number;
  warehouse: number;
  warehouse_name: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  created_at: string;
};

export type OrderStatusHistory = {
  id: number;
  old_status: string;
  new_status: string;
  changed_by: number;
  changed_by_name: string;
  note: string;
  created_at: string;
};

export type OrderDetail = {
  id: number;
  order_number: string;
  user: number;
  status: string;
  status_display: string;
  payment_status: string;
  payment_status_display: string;
  subtotal: string;
  discount_amount: string;
  shipping_cost: string;
  tax_amount: string;
  total_amount: string;
  receiver_name: string;
  receiver_phone: string;
  province: string;
  city: string;
  address: string;
  postal_code: string;
  customer_note: string;
  admin_note: string;
  paid_at: string | null;
  cancelled_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  status_history: OrderStatusHistory[];
};

export type CheckoutPayload = {
  receiver_name: string;
  receiver_phone: string;
  province: string;
  city: string;
  address: string;
  postal_code: string;
  customer_note?: string;
  discount_code?: string;
  shipping_cost?: number;
};
