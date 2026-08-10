import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { clearSession, setAccessToken } from "@/lib/auth/session-storage";

import type {
    LogoutResponse,
    OtpRequestPayload,
    OtpRequestResponse,
    OtpVerifyPayload,
    OtpVerifyResponse,
    ProfileResponse,
    TokenRefreshResponse,
} from "./types";

export async function requestOtp(payload: OtpRequestPayload) {
  const response = await apiClient.post<OtpRequestResponse>(
    API_ENDPOINTS.auth.otpRequest,
    payload,
  );

  return response.data;
}

export async function verifyOtp(payload: OtpVerifyPayload) {
  const response = await apiClient.post<OtpVerifyResponse>(
    API_ENDPOINTS.auth.otpVerify,
    payload,
  );

  setAccessToken(response.data.access);

  return response.data;
}

export async function refreshSession() {
  const response = await apiClient.post<TokenRefreshResponse>(
    API_ENDPOINTS.auth.tokenRefresh,
  );

  setAccessToken(response.data.access);

  return response.data;
}

export async function getProfile() {
  const response = await apiClient.get<ProfileResponse>(API_ENDPOINTS.auth.profile);

  return response.data;
}

export async function logout() {
  const response = await apiClient.post<LogoutResponse>(API_ENDPOINTS.auth.logout);

  clearSession();

  return response.data;
}