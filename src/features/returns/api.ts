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

/** One bounded history page for shared order status displays. */
export async function getReturnsPage(page = 1, signal?: AbortSignal): Promise<PaginatedReturnsResponse> {
  const response = await apiClient.get<ReturnListItem[] | PaginatedReturnsResponse>(
    API_ENDPOINTS.returns.requests,
    { params: { page, page_size: 20 }, signal },
  );
  return Array.isArray(response.data)
    ? { count: response.data.length, next: null, previous: null, results: response.data }
    : response.data;
}

export async function getReturns(): Promise<ReturnListItem[]> {
  const all: ReturnListItem[] = [];
  const visited = new Set<string>();
  let next: string | null = API_ENDPOINTS.returns.requests;
  while (next) {
    if (visited.has(next)) throw new Error("Returns pagination loop detected");
    visited.add(next);
    const page: ReturnListItem[] | PaginatedReturnsResponse = (
      await apiClient.get<ReturnListItem[] | PaginatedReturnsResponse>(next)
    ).data;

    if (Array.isArray(page)) return [...all, ...page];
    all.push(...page.results);
    next = page.next;
  }
  return all;
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
