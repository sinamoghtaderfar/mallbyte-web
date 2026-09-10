import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import type {
  CancelPaymentPayload,
  CreatePaymentPayload,
  MarkPaymentFailedPayload,
  MarkPaymentSuccessPayload,
  PaymentDetail,
} from "./types";

export async function createPayment(payload: CreatePaymentPayload) {
  const response = await apiClient.post<PaymentDetail>(
    API_ENDPOINTS.payments.payments,
    payload,
  );

  return response.data;
}

export async function getPayment(paymentId: number | string) {
  const response = await apiClient.get<PaymentDetail>(
    API_ENDPOINTS.payments.paymentDetail(paymentId),
  );

  return response.data;
}

export async function markPaymentSuccess(
  paymentId: number | string,
  payload: MarkPaymentSuccessPayload = {},
) {
  const response = await apiClient.post<PaymentDetail>(
    API_ENDPOINTS.payments.markSuccess(paymentId),
    payload,
  );

  return response.data;
}

export async function markPaymentFailed(
  paymentId: number | string,
  payload: MarkPaymentFailedPayload = {},
) {
  const response = await apiClient.post<PaymentDetail>(
    API_ENDPOINTS.payments.markFailed(paymentId),
    payload,
  );

  return response.data;
}

export async function cancelPaymentAttempt(
  paymentId: number | string,
  payload: CancelPaymentPayload = {},
) {
  const response = await apiClient.post<PaymentDetail>(
    API_ENDPOINTS.payments.cancel(paymentId),
    payload,
  );

  return response.data;
}
