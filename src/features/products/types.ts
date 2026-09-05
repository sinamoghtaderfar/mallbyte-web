export type ProductListItem = {
  id: number;
  name: string;
  slug: string;
  main_image: string | null;
  price: string;
  compare_price: string | null;
  final_price: string;
  brand_name: string | null;
  category_name: string | null;
  stock: number;
  available_stock: number;
  reserved_stock: number;
  is_featured: boolean;
  views_count: number;
  created_at: string;
  barcode: string | null;
  labels: string[];
  label_display: string[];
};

export type ProductImage = {
  id: number;
  image: string;
  alt_text: string;
  is_main: boolean;
  order: number;
  created_at: string;
};

export type ProductVariant = {
  id: number;
  name: string;
  sku: string;
  price: string;
  compare_price: string | null;
  final_price: string;
  stock: number;
  is_default: boolean;
  created_at: string;
};

export type ProductAttribute = {
  attribute: string;
  attribute_slug: string;
  value: string;
  value_slug: string;
};

export type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: string;
  compare_price: string | null;
  final_price: string;
  cost_per_item: string | null;
  seller_name: string | null;
  seller_email: string | null;
  category: number | null;
  category_name: string | null;
  brand: number | null;
  brand_name: string | null;
  brand_logo: string | null;
  sku: string;
  stock: number;
  available_stock: number;
  reserved_stock: number;
  is_in_stock: boolean;
  low_stock_threshold: number;
  weight: string | null;
  length: string | null;
  width: string | null;
  height: string | null;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  attributes: ProductAttribute[];
  tags: {
    id: number;
    name: string;
    slug: string;
    created_at: string;
  }[];
  average_rating: number | string | null;
  reviews_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  barcode: string | null;
  labels: string[];
  label_display: string[];
};

export type ProductCategory = {
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

export type ProductBrand = {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  description: string;
  website: string;
  is_active: boolean;
  created_at: string;
};

export type ProductQueryParams = {
  search?: string;
  category?: string;
  brand?: string;
  min_price?: string;
  max_price?: string;
  in_stock?: string;
  has_discount?: string;
  label?: string;
  ordering?: string;
};
