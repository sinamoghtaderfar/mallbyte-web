export type DiscountValidationResult = {
  code: string;
  title: string;
  discount_type: string;
  discount_amount: string;
  cart_subtotal: string;
  total_after_discount: string;
};

export type DiscountValidatePayload = {
  code: string;
};
