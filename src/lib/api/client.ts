import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
    clearSession,
    getAccessToken,
    setAccessToken,
} from "@/lib/auth/session-storage";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
  withCredentials: true,
});

function shouldRefreshToken(
  error: AxiosError,
  request?: RetryableRequestConfig,
): request is RetryableRequestConfig {
  if (error.response?.status !== 401) {
    return false;
  }

  if (!request || request._retry) {
    return false;
  }

  if (request.url === API_ENDPOINTS.auth.tokenRefresh) {
    return false;
  }

  return true;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (shouldRefreshToken(error, originalRequest)) {
      originalRequest._retry = true;

      try {
        const response = await refreshClient.post<{ access: string }>(
          API_ENDPOINTS.auth.tokenRefresh,
        );

        setAccessToken(response.data.access);
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        clearSession();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);