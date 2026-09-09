import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import type {
  DiscountValidatePayload,
  DiscountValidationResult,
} from "./types";

export async function validateDiscountCode(payload: DiscountValidatePayload) {
  const response = await apiClient.post<DiscountValidationResult>(
    API_ENDPOINTS.discounts.validate,
    payload,
  );

  return response.data;
}
