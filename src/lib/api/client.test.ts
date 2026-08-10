import type { AxiosInstance, AxiosRequestConfig } from "axios";
import type AxiosMockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it, vi } from "vitest";

type SessionModule = typeof import("@/lib/auth/session-storage");
type EndpointsModule = typeof import("@/lib/api/endpoints");

let activeMock: AxiosMockAdapter | null = null;

async function loadClient(apiBaseUrl?: string): Promise<{
  apiClient: AxiosInstance;
  session: SessionModule;
  mock: AxiosMockAdapter;
  API_ENDPOINTS: EndpointsModule["API_ENDPOINTS"];
}> {
  vi.resetModules();

  if (apiBaseUrl) {
    process.env.NEXT_PUBLIC_API_BASE_URL = apiBaseUrl;
  } else {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  const axios = (await import("axios")).default;
  const AxiosMockAdapter = (await import("axios-mock-adapter")).default;

  activeMock = new AxiosMockAdapter(axios);

  const session = await import("@/lib/auth/session-storage");
  const { API_ENDPOINTS } = await import("@/lib/api/endpoints");
  const { apiClient } = await import("./client");

  session.clearSession();

  return {
    apiClient,
    session,
    mock: activeMock,
    API_ENDPOINTS,
  };
}

function getAuthorizationHeader(config: AxiosRequestConfig) {
  const headers = config.headers as Record<string, string | undefined> | undefined;

  return headers?.Authorization ?? headers?.authorization;
}

afterEach(() => {
  activeMock?.restore();
  activeMock = null;

  delete process.env.NEXT_PUBLIC_API_BASE_URL;

  vi.resetModules();
  vi.restoreAllMocks();
});

describe("api client config", () => {
  it("uses localhost backend by default", async () => {
    const { apiClient } = await loadClient();

    expect(apiClient.defaults.baseURL).toBe("http://localhost:8000");
  });

  it("uses NEXT_PUBLIC_API_BASE_URL without a trailing slash", async () => {
    const { apiClient } = await loadClient("http://localhost:9000/api/");

    expect(apiClient.defaults.baseURL).toBe("http://localhost:9000/api");
  });

  it("sends cookies for refresh token support", async () => {
    const { apiClient } = await loadClient();

    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it("uses json content type by default", async () => {
    const { apiClient } = await loadClient();

    expect(apiClient.defaults.headers["Content-Type"]).toBe("application/json");
  });

  it("uses a request timeout", async () => {
    const { apiClient } = await loadClient();

    expect(apiClient.defaults.timeout).toBe(15000);
  });
});

describe("api client auth header", () => {
  it("adds Authorization header when an access token exists", async () => {
    const { apiClient, session, mock, API_ENDPOINTS } = await loadClient();

    session.setAccessToken("access-token");

    mock.onGet(API_ENDPOINTS.auth.profile).reply((config) => {
      expect(getAuthorizationHeader(config)).toBe("Bearer access-token");

      return [
        200,
        {
          ok: true,
        },
      ];
    });

    const response = await apiClient.get(API_ENDPOINTS.auth.profile);

    expect(response.data).toEqual({
      ok: true,
    });
  });

  it("does not add Authorization header without an access token", async () => {
    const { apiClient, session, mock, API_ENDPOINTS } = await loadClient();

    session.clearSession();

    mock.onGet(API_ENDPOINTS.auth.profile).reply((config) => {
      expect(getAuthorizationHeader(config)).toBeUndefined();

      return [
        200,
        {
          ok: true,
        },
      ];
    });

    const response = await apiClient.get(API_ENDPOINTS.auth.profile);

    expect(response.data).toEqual({
      ok: true,
    });
  });
});

describe("api client refresh flow", () => {
  it("refreshes the access token and retries the original request after a 401", async () => {
    const { apiClient, session, mock, API_ENDPOINTS } = await loadClient();

    session.setAccessToken("old-access-token");

    mock.onGet(API_ENDPOINTS.auth.profile).replyOnce(401, {
      detail: "Access token expired.",
    });

    mock.onPost(API_ENDPOINTS.auth.tokenRefresh).reply((config) => {
      expect(getAuthorizationHeader(config)).toBeUndefined();

      return [
        200,
        {
          access: "new-access-token",
        },
      ];
    });

    mock.onGet(API_ENDPOINTS.auth.profile).reply((config) => {
      expect(getAuthorizationHeader(config)).toBe("Bearer new-access-token");

      return [
        200,
        {
          ok: true,
        },
      ];
    });

    const response = await apiClient.get(API_ENDPOINTS.auth.profile);

    expect(response.data).toEqual({
      ok: true,
    });
    expect(session.getAccessToken()).toBe("new-access-token");
    expect(mock.history.get).toHaveLength(2);
    expect(mock.history.post).toHaveLength(1);
  });

  it("does not refresh for non-401 errors", async () => {
    const { apiClient, mock, API_ENDPOINTS } = await loadClient();

    mock.onGet(API_ENDPOINTS.auth.profile).reply(403, {
      detail: "Forbidden.",
    });

    await expect(apiClient.get(API_ENDPOINTS.auth.profile)).rejects.toMatchObject({
      response: {
        status: 403,
      },
    });

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.post).toHaveLength(0);
  });

  it("does not retry the same request more than once", async () => {
  const { apiClient, session, mock, API_ENDPOINTS } = await loadClient();

  session.setAccessToken("old-access-token");

  mock.onGet(API_ENDPOINTS.auth.profile).replyOnce(401, {
    detail: "Access token expired.",
  });

  mock.onPost(API_ENDPOINTS.auth.tokenRefresh).reply(200, {
    access: "new-access-token",
  });

  mock.onGet(API_ENDPOINTS.auth.profile).replyOnce(401, {
    detail: "Still unauthorized.",
  });

  await expect(
    apiClient.get(API_ENDPOINTS.auth.profile),
  ).rejects.toMatchObject({
    response: {
      status: 401,
    },
  });

  expect(session.getAccessToken()).toBe("new-access-token");
  expect(mock.history.get).toHaveLength(2);
  expect(mock.history.post).toHaveLength(1);
}); // ← تست قبلی اینجا تمام می‌شود


it("rejects network errors without trying to refresh", async () => {
  const { apiClient, session, mock, API_ENDPOINTS } = await loadClient();

  session.setAccessToken("access-token");

  mock.onGet(API_ENDPOINTS.auth.profile).networkError();

  await expect(
    apiClient.get(API_ENDPOINTS.auth.profile),
  ).rejects.toMatchObject({
    message: "Network Error",
  });

  expect(session.getAccessToken()).toBe("access-token");
  expect(mock.history.get).toHaveLength(1);
  expect(mock.history.post).toHaveLength(0);
});


it("rejects timeout errors without trying to refresh", async () => {
  const { apiClient, session, mock, API_ENDPOINTS } = await loadClient();

  session.setAccessToken("access-token");

  mock.onGet(API_ENDPOINTS.auth.profile).timeout();

  await expect(
    apiClient.get(API_ENDPOINTS.auth.profile),
  ).rejects.toMatchObject({
    code: "ECONNABORTED",
  });

  expect(session.getAccessToken()).toBe("access-token");
  expect(mock.history.get).toHaveLength(1);
  expect(mock.history.post).toHaveLength(0);
});


it("clears the session when refresh fails", async () => {
  const { apiClient, session, mock, API_ENDPOINTS } = await loadClient();

  session.setAccessToken("old-access-token");

  mock.onGet(API_ENDPOINTS.auth.profile).replyOnce(401, {
    detail: "Access token expired.",
  });

  mock.onPost(API_ENDPOINTS.auth.tokenRefresh).reply(401, {
    detail: "Refresh token is invalid or expired.",
  });

  await expect(
    apiClient.get(API_ENDPOINTS.auth.profile),
  ).rejects.toMatchObject({
    response: {
      status: 401,
    },
  });

  expect(session.getAccessToken()).toBeNull();
  expect(mock.history.get).toHaveLength(1);
  expect(mock.history.post).toHaveLength(1);
});
});