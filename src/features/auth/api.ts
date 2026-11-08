import {
  apiClient,
  assertCurrentSession,
  refreshAccessToken,
  sessionClient,
} from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
  beginLogout,
  confirmLogout,
  establishSession,
  getAccessToken,
  getLogoutStatus,
  getSessionGeneration,
  isCurrentSession,
} from "@/lib/auth/session-storage";
import { useAuthStore } from "./auth-store";

import type {
  AuthSuccessResponse,
  MFASetupResponse,
  LogoutResponse,
  OtpRequestPayload,
  OtpRequestResponse,
  OtpVerifyPayload,
  OtpVerifyResponse,
  ProfileResponse,
} from "./types";

let pendingLogout: Promise<LogoutResponse> | null = null;

async function prepareLogin() {
  const generation = getSessionGeneration();
  // An older logout response must not delete the fresh login's HttpOnly cookie.
  if (pendingLogout) await pendingLogout.catch(() => undefined);
  assertCurrentSession(generation);
  if (getLogoutStatus() === "pending") await logout();
  assertCurrentSession(generation);
  return generation;
}

export async function requestOtp(payload: OtpRequestPayload) {
  const response = await apiClient.post<OtpRequestResponse>(
    API_ENDPOINTS.auth.otpRequest,
    payload,
  );

  return response.data;
}

export async function verifyOtp(payload: OtpVerifyPayload) {
  const generation = await prepareLogin();
  const response = await apiClient.post<OtpVerifyResponse>(
    API_ENDPOINTS.auth.otpVerify,
    payload,
  );

  if ("access" in response.data) {
    assertCurrentSession(generation);
    establishSession(response.data.access, generation);
    useAuthStore.getState().setSessionIssue(null);
  }

  return response.data;
}

export async function setupAdminMfa(payload: {
  challenge: string;
  password: string;
}) {
  const response = await apiClient.post<MFASetupResponse>(
    API_ENDPOINTS.auth.mfaSetup,
    payload,
  );
  return response.data;
}

export async function finishAdminMfa(
  payload: { challenge: string; code: string },
  enrollment: boolean,
) {
  const generation = await prepareLogin();
  const endpoint = enrollment
    ? API_ENDPOINTS.auth.mfaComplete
    : API_ENDPOINTS.auth.mfaVerify;
  const response = await apiClient.post<AuthSuccessResponse>(endpoint, payload);
  assertCurrentSession(generation);
  establishSession(response.data.access, generation);
  useAuthStore.getState().setSessionIssue(null);
  return response.data;
}

export async function refreshSession() {
  return refreshAccessToken();
}

export async function getProfile() {
  const response = await apiClient.get<ProfileResponse>(
    API_ENDPOINTS.auth.profile,
  );

  return response.data;
}

export async function logout() {
  if (pendingLogout) return pendingLogout;
  const bearer = getAccessToken();
  const generation = beginLogout();
  useAuthStore.getState().setSessionIssue("logout-unconfirmed");
  useAuthStore.getState().setSigningOut(true);
  const request = sessionClient
    .post<LogoutResponse>(API_ENDPOINTS.auth.logout, undefined, {
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    })
    .then(({ data }) => {
      confirmLogout(generation);
      if (isCurrentSession(generation))
        useAuthStore.getState().setSessionIssue(null);
      return data;
    })
    .finally(() => {
      if (pendingLogout === request) pendingLogout = null;
      useAuthStore.getState().setSigningOut(false);
    });
  pendingLogout = request;
  return request;
}
