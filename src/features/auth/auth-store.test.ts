import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "./auth-store";
import type { AuthUser } from "./types";

const user: AuthUser = {
  id: 1,
  email: "user@example.com",
  phone: null,
  full_name: "Test User",
  is_seller: false,
  email_verified: true,
};

describe("auth store", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it("stores the authenticated user", () => {
    useAuthStore.getState().setUser(user);

    const state = useAuthStore.getState();

    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });

  it("updates loading state", () => {
    useAuthStore.getState().setLoading(true);

    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  it("clears auth state", () => {
    useAuthStore.getState().setUser(user);

    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});
