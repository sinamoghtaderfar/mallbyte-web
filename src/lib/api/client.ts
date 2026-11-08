import axios, {
  AxiosError,
  CanceledError,
  InternalAxiosRequestConfig,
} from "axios";

import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
  getAccessToken,
  getSessionGeneration,
  invalidateSession,
  isCurrentSession,
  isSessionRestorationBlocked,
  setAccessToken,
} from "@/lib/auth/session-storage";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
type SessionRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _sessionGeneration?: number;
  _authenticated?: boolean;
};
const options = {
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
  withCredentials: true,
};

export const apiClient = axios.create(options);
// Refresh and logout must never recursively refresh or acquire a stale bearer.
export const sessionClient = axios.create(options);
let refreshing: {
  generation: number;
  promise: Promise<{ access: string }>;
} | null = null;

export function assertCurrentSession(expected: number) {
  if (!isCurrentSession(expected))
    throw new CanceledError("The session changed. Please try again.");
}

export function refreshAccessToken(): Promise<{ access: string }> {
  const generation = getSessionGeneration();
  if (isSessionRestorationBlocked())
    return Promise.reject(new CanceledError("Sign in again to continue."));
  if (refreshing?.generation === generation) return refreshing.promise;

  const promise = sessionClient
    .post<{ access: string }>(API_ENDPOINTS.auth.tokenRefresh)
    .then(({ data }) => {
      assertCurrentSession(generation);
      if (isSessionRestorationBlocked())
        throw new CanceledError("Sign in again to continue.");
      if (typeof data.access !== "string" || !data.access)
        throw new Error("Invalid session response.");
      setAccessToken(data.access);
      return data;
    })
    .catch((error: unknown) => {
      if (
        isCurrentSession(generation) &&
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        invalidateSession("expired");
      }
      throw error;
    })
    .finally(() => {
      if (refreshing?.promise === promise) refreshing = null;
    });
  refreshing = { generation, promise };
  return promise;
}

apiClient.interceptors.request.use(
  (request: SessionRequest) => {
    request._sessionGeneration = getSessionGeneration();
    const token = isSessionRestorationBlocked() ? null : getAccessToken();
    request._authenticated = Boolean(token);
    if (token) request.headers.Authorization = `Bearer ${token}`;
    else delete request.headers.Authorization;
    return request;
  },
  undefined,
  { synchronous: true },
);

apiClient.interceptors.response.use(
  (response) => {
    assertCurrentSession(
      (response.config as SessionRequest)._sessionGeneration!,
    );
    return response;
  },
  async (error: AxiosError) => {
    const request = error.config as SessionRequest | undefined;
    if (!request) return Promise.reject(error);
    assertCurrentSession(request._sessionGeneration!);

    if (
      error.response?.status === 401 &&
      request._authenticated &&
      request.url !== API_ENDPOINTS.auth.tokenRefresh &&
      !isSessionRestorationBlocked()
    ) {
      if (request._retry) {
        invalidateSession("expired");
        return Promise.reject(error);
      }
      request._retry = true;
      const generation = request._sessionGeneration!;
      const response = await refreshAccessToken();
      assertCurrentSession(generation);
      request.headers.Authorization = `Bearer ${response.access}`;
      return apiClient(request);
    }
    return Promise.reject(error);
  },
);
