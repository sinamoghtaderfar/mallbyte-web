export type SellerProductCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  parent_name: string | null;
  description: string;
  image: string | null;
  is_active: boolean;
  order: number;
  created_at: string;
};

export type SellerProductBrand = {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  description: string;
  website: string;
  is_active: boolean;
  created_at: string;
};

export type SellerProductPayload = {
  name: string;
  description: string;
  short_description: string;
  price: string;
  compare_price: string | null;
  cost_per_item: string | null;
  category: number;
  brand: number | null;
  sku: string;
  low_stock_threshold: number;
  weight: string | null;
  length: string | null;
  width: string | null;
  height: string | null;
  barcode: string | null;
  labels: string[];
};

export type SellerProductCreateResponse = SellerProductPayload & {
  id: number;
  stock: number;
  available_stock: number;
  reserved_stock: number;
};

export type SellerProductVariantPayload = {
  name: string;
  sku: string;
  price: string;
  compare_price: string | null;
  stock: number;
  is_default: boolean;
};
