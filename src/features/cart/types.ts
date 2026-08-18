export type CartItem = {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  product_price: string;
  available_stock: number;
  quantity: number;
  unit_price: string;
  total_price: string;
  created_at: string;
  updated_at: string;
};

export type Cart = {
  id: number;
  user: number;
  items: CartItem[];
  total_items: number;
  subtotal: string;
  created_at: string;
  updated_at: string;
};

export type AddToCartPayload = {
  product: number;
  quantity: number;
};

export type UpdateCartItemPayload = {
  quantity: number;
};
