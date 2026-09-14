import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import type {
  CreateReturnPayload,
  ReturnActionPayload,
  ReturnDetail,
  ReturnListItem,
} from "./types";

type PaginatedReturnsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ReturnListItem[];
};

export async function getReturns() {
  const response = await apiClient.get<
    ReturnListItem[] | PaginatedReturnsResponse
  >(API_ENDPOINTS.returns.requests);

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return response.data.results;
}

export async function getReturnRequest(returnId: number | string) {
  const response = await apiClient.get<ReturnDetail>(
    API_ENDPOINTS.returns.detail(returnId),
  );

  return response.data;
}

export async function createReturnRequest(payload: CreateReturnPayload) {
  const response = await apiClient.post<ReturnDetail>(
    API_ENDPOINTS.returns.requests,
    payload,
  );

  return response.data;
}

export async function cancelReturnRequest(
  returnId: number | string,
  payload: ReturnActionPayload = {},
) {
  const response = await apiClient.post<ReturnDetail>(
    API_ENDPOINTS.returns.cancel(returnId),
    payload,
  );

  return response.data;
}
