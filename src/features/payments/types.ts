export type PaymentEvent = {
  id: number;
  event_type: string;
  old_status: string;
  new_status: string;
  message: string;
  data: Record<string, unknown>;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
};

export type PaymentDetail = {
  id: number;
  payment_number: string;
  order: number;
  order_number: string;
  user: number;
  user_email: string;
  user_full_name: string;
  provider: string;
  provider_display: string;
  status: string;
  status_display: string;
  amount: string;
  currency: string;
  gateway_reference: string;
  gateway_response: Record<string, unknown>;
  failure_reason: string;
  paid_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  events: PaymentEvent[];
};

export type CreatePaymentPayload = {
  order: number;
  provider: "mock";
};

export type MarkPaymentSuccessPayload = {
  gateway_reference?: string;
  gateway_response?: Record<string, unknown>;
};

export type MarkPaymentFailedPayload = {
  reason?: string;
  gateway_response?: Record<string, unknown>;
};

export type CancelPaymentPayload = {
  reason?: string;
};
