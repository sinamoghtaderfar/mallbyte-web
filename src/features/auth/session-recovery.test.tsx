import { act, render, screen, waitFor } from "@testing-library/react";
import AxiosMockAdapter from "axios-mock-adapter";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient, sessionClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
  clearSession,
  getAccessToken,
  getLogoutStatus,
  LOGOUT_STORAGE_KEY,
} from "@/lib/auth/session-storage";
import { useCartStore } from "@/features/cart/cart-store";
import { useNotificationStore } from "@/features/notifications/notification-store";
import { logout, verifyOtp } from "./api";
import { AuthProvider } from "./auth-provider";
import { useAuthStore } from "./auth-store";
import { GuestOnlyRoute } from "./components/guest-only-route";
import { ProtectedRoute } from "./components/protected-route";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
const router = { replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const user = {
  id: 1,
  email: "user@example.test",
  full_name: "Test User",
  phone: null,
  is_seller: false,
  email_verified: true,
};
const cart = {
  id: 1,
  user: 1,
  items: [],
  total_items: 3,
  subtotal: "100",
  created_at: "2026-11-08T00:00:00Z",
  updated_at: "2026-11-08T00:00:00Z",
};
const endpoints = API_ENDPOINTS.auth;
let api: AxiosMockAdapter;
let session: AxiosMockAdapter;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function mount() {
  return render(
    <StrictMode>
      <AuthProvider>
        <ProtectedRoute>
          <div>Private workspace</div>
        </ProtectedRoute>
        <GuestOnlyRoute>
          <div>Sign-in form</div>
        </GuestOnlyRoute>
      </AuthProvider>
    </StrictMode>,
  );
}

async function signedIn() {
  const view = mount();
  await screen.findByText("Private workspace");
  useCartStore.getState().setCart(cart);
  useNotificationStore.getState().setUnreadCount(4);
  return view;
}

function expectSignedOut() {
  expect(getAccessToken()).toBeNull();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(useAuthStore.getState().user).toBeNull();
  expect(useCartStore.getState().cart).toBeNull();
  expect(useNotificationStore.getState().unreadCount).toBe(0);
}

beforeEach(() => {
  localStorage.clear();
  clearSession();
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isBootstrapped: false,
    sessionIssue: null,
    isSigningOut: false,
  });
  useCartStore.getState().clearCartState();
  useNotificationStore.getState().reset();
  api = new AxiosMockAdapter(apiClient);
  session = new AxiosMockAdapter(sessionClient);
  session
    .onPost(endpoints.tokenRefresh)
    .reply(200, { access: "original-bearer" });
  api.onGet(endpoints.profile).reply(200, { user });
});

afterEach(() => {
  api.restore();
  session.restore();
  localStorage.clear();
});

describe("session teardown and recovery", () => {
  it("treats an anonymous bootstrap 401 as a normal guest visit without an expiry warning", async () => {
    session
      .onPost(endpoints.tokenRefresh)
      .reply(401, { detail: "No refresh cookie" });
    mount();
    await screen.findByText("Sign-in form");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(api.history.get).toHaveLength(0);
  });

  it("clears credentials/private state immediately and blocks restoration after failed logout, including remount", async () => {
    const response = deferred<[number, unknown]>();
    session.onPost(endpoints.logout).reply(() => response.promise);
    const view = await signedIn();
    let request!: ReturnType<typeof logout>;
    act(() => {
      request = logout();
    });
    expectSignedOut();
    expect(getLogoutStatus()).toBe("pending");
    expect(localStorage.getItem(LOGOUT_STORAGE_KEY)).not.toContain(
      "original-bearer",
    );
    await act(async () => {
      response.resolve([503, { detail: "Unavailable" }]);
      await expect(request).rejects.toMatchObject({
        response: { status: 503 },
      });
    });
    expect(
      screen.getByText(/Server sign-out could not be confirmed/),
    ).toBeInTheDocument();
    api.onGet("/private/").reply(401);
    await expect(apiClient.get("/private/")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(api.history.get.at(-1)?.headers?.Authorization).toBeUndefined();
    expect(
      session.history.post.filter((r) => r.url === endpoints.tokenRefresh),
    ).toHaveLength(1);
    view.unmount();
    mount();
    await screen.findByText("Sign-in form");
    expect(
      session.history.post.filter((r) => r.url === endpoints.tokenRefresh),
    ).toHaveLength(1);
    expect(
      api.history.get.filter((r) => r.url === endpoints.profile),
    ).toHaveLength(1);
    expectSignedOut();
  });

  it("sends the original bearer/cookies for backend revocation and confirms successful logout", async () => {
    await signedIn();
    session.onPost(endpoints.logout).reply((config) => {
      expect(config.headers?.Authorization).toBe("Bearer original-bearer");
      expect(config.withCredentials).toBe(true);
      expect(getAccessToken()).toBeNull();
      return [200, { message: "Logged out" }];
    });
    await act(async () => {
      await logout();
    });
    expectSignedOut();
    expect(getLogoutStatus()).toBe("confirmed");
    expect(useAuthStore.getState().sessionIssue).toBeNull();
    expect(session.history.post).toHaveLength(2); // bootstrap refresh + logout
  });

  it.each([401, 403])(
    "clears Zustand/private state on terminal refresh %s and permits sign-in",
    async (status) => {
      await signedIn();
      api.onGet("/private/").reply(401);
      session
        .onPost(endpoints.tokenRefresh)
        .reply(status, { detail: "Session revoked" });
      await act(async () => {
        await expect(apiClient.get("/private/")).rejects.toMatchObject({
          response: { status },
        });
      });
      expectSignedOut();
      expect(screen.getByText("Sign-in form")).toBeInTheDocument();
      expect(screen.queryByText("Private workspace")).not.toBeInTheDocument();
      expect(screen.getByText(/Your session has expired/)).toBeInTheDocument();
      expect(replace).toHaveBeenCalledWith("/auth");
    },
  );

  it("also invalidates a session rejected after its one allowed refresh retry", async () => {
    await signedIn();
    api.onGet("/private/").reply(401);
    await act(async () => {
      await expect(apiClient.get("/private/")).rejects.toMatchObject({
        response: { status: 401 },
      });
    });
    expectSignedOut();
    expect(api.history.get.filter((r) => r.url === "/private/")).toHaveLength(
      2,
    );
  });

  it.each(["server", "network"])(
    "preserves recoverable identity on transient refresh %s failure",
    async (failure) => {
      await signedIn();
      api.onGet("/private/").reply(401);
      if (failure === "network")
        session.onPost(endpoints.tokenRefresh).networkError();
      else session.onPost(endpoints.tokenRefresh).reply(503);
      await act(async () => {
        await expect(apiClient.get("/private/")).rejects.toBeDefined();
      });
      expect(getAccessToken()).toBe("original-bearer");
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useCartStore.getState().cart).toEqual(cart);
      expect(useAuthStore.getState().sessionIssue).toBeNull();
    },
  );

  it("keeps an ordinary permission-denied response separate from session expiry", async () => {
    await signedIn();
    api.onGet("/private/").reply(403);
    await expect(apiClient.get("/private/")).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(session.history.post).toHaveLength(1);
  });

  it("discards a refresh response arriving after logout without retrying private requests", async () => {
    await signedIn();
    const response = deferred<[number, unknown]>();
    api.onGet("/private/").reply(401);
    session.onPost(endpoints.tokenRefresh).reply(() => response.promise);
    session.onPost(endpoints.logout).reply(200, { message: "Logged out" });
    const request = apiClient.get("/private/");
    const rejection = expect(request).rejects.toMatchObject({
      code: "ERR_CANCELED",
    });
    await waitFor(() => expect(session.history.post).toHaveLength(2));
    await act(async () => {
      await logout();
      response.resolve([200, { access: "late-bearer" }]);
      await rejection;
    });
    expectSignedOut();
    expect(api.history.get.filter((r) => r.url === "/private/")).toHaveLength(
      1,
    );
  });

  it("discards a pending bootstrap profile after logout, including StrictMode", async () => {
    const response = deferred<[number, unknown]>();
    api.onGet(endpoints.profile).reply(() => response.promise);
    session.onPost(endpoints.logout).reply(200, { message: "Logged out" });
    mount();
    await waitFor(() => expect(api.history.get).toHaveLength(1));
    await act(async () => {
      await logout();
      response.resolve([200, { user }]);
    });
    await screen.findByText("Sign-in form");
    expectSignedOut();
    expect(
      session.history.post.filter((r) => r.url === endpoints.tokenRefresh),
    ).toHaveLength(1);
  });

  it("does not let an older refresh failure clear a fresh explicit login", async () => {
    await signedIn();
    const response = deferred<[number, unknown]>();
    api.onGet("/private/").reply(401);
    session.onPost(endpoints.tokenRefresh).reply(() => response.promise);
    session.onPost(endpoints.logout).reply(200, { message: "Logged out" });
    api
      .onPost(endpoints.otpVerify)
      .reply(200, { user, access: "fresh-bearer", is_new: false });
    const request = apiClient.get("/private/");
    const rejection = expect(request).rejects.toBeDefined();
    await waitFor(() => expect(session.history.post).toHaveLength(2));
    await act(async () => {
      await logout();
      const login = await verifyOtp({ email: user.email, code: "123456" });
      if ("user" in login) useAuthStore.getState().setUser(login.user);
      useCartStore.getState().setCart(cart);
      response.resolve([401, { detail: "Old session rejected" }]);
      await rejection;
    });
    expect(getAccessToken()).toBe("fresh-bearer");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useCartStore.getState().cart).toEqual(cart);
  });

  it("finishes/retries remote logout before allowing a fresh login cookie", async () => {
    await signedIn();
    session.onPost(endpoints.logout).networkError();
    await act(async () => {
      await expect(logout()).rejects.toBeDefined();
    });
    const response = deferred<[number, unknown]>();
    session.onPost(endpoints.logout).reply(() => response.promise);
    api
      .onPost(endpoints.otpVerify)
      .reply(200, { user, access: "fresh-bearer", is_new: false });
    const request = verifyOtp({ email: user.email, code: "123456" });
    await waitFor(() =>
      expect(
        session.history.post.filter((r) => r.url === endpoints.logout),
      ).toHaveLength(2),
    );
    expect(api.history.post).toHaveLength(0);
    await act(async () => {
      response.resolve([200, { message: "Logged out" }]);
      await request;
    });
    expect(api.history.post).toHaveLength(1);
    expect(getAccessToken()).toBe("fresh-bearer");
    expect(getLogoutStatus()).toBeNull();
  });

  it("rejects a successful OTP verification that completes after a new logout intent", async () => {
    const view = await signedIn();
    await act(async () => {
      session.onPost(endpoints.logout).reply(200, { message: "Logged out" });
      await logout();
    });
    const response = deferred<[number, unknown]>();
    api.onPost(endpoints.otpVerify).reply(() => response.promise);
    const request = verifyOtp({ email: user.email, code: "123456" });
    const rejection = expect(request).rejects.toMatchObject({
      code: "ERR_CANCELED",
    });
    await waitFor(() => expect(api.history.post).toHaveLength(1));
    // Another tab records a newer logout while verification is pending.
    localStorage.setItem(LOGOUT_STORAGE_KEY, "pending:another-tab");
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LOGOUT_STORAGE_KEY,
          newValue: "pending:another-tab",
        }),
      );
      response.resolve([200, { user, access: "late-bearer", is_new: false }]);
      await rejection;
    });
    expectSignedOut();
    expect(getLogoutStatus()).toBe("pending");
    view.unmount();
  });

  it("clears another tab's identity and private state on logout storage events", async () => {
    await signedIn();
    localStorage.setItem(LOGOUT_STORAGE_KEY, "pending:other-tab");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LOGOUT_STORAGE_KEY,
          newValue: "pending:other-tab",
        }),
      );
    });
    expectSignedOut();
    expect(screen.getByText("Sign-in form")).toBeInTheDocument();
  });
});
