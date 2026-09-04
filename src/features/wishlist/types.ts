export type WishlistItem = {
  id: number;
  product: number;
  product_name: string;
  product_price: string;
  product_image: string | null;
  created_at: string;
};

export type WishlistCreatePayload = {
  product: number;
};
