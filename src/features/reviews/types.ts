export type ProductReview = {
  id: number;
  customer: number;
  customer_display: string;
  product: number;
  product_name: string;
  order_item: number | null;
  rating: number;
  title: string;
  comment: string;
  status: string;
  is_verified_purchase: boolean;
  approved_by: number | null;
  approved_by_display: string | null;
  approved_at: string | null;
  rejected_reason: string;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
};

export type ProductReviewSummary = {
  product_id: number;
  average_rating: string;
  reviews_count: number;
  rating_breakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
  total_approved_reviews: number;
};

export type ProductReviewFilters = {
  rating?: string;
  is_verified_purchase?: string;
};

export type ProductReviewPayload = {
  product: number;
  rating: number;
  title: string;
  comment: string;
};
