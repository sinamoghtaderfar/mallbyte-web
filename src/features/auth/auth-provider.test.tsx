import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearSession, setAccessToken } from "@/lib/auth/session-storage";

import { AuthProvider } from "./auth-provider";
import { useAuthStore } from "./auth-store";

const refreshSessionMock = vi.fn();
const getProfileMock = vi.fn();

vi.mock("./api", () => ({
  refreshSession: () => refreshSessionMock(),
  getProfile: () => getProfileMock(),
}));

const user = {
  id: 1,
  email: "user@example.com",
  phone: null,
  full_name: "Test User",
  is_seller: false,
  email_verified: true,
};

function renderProvider() {
  return render(
    <AuthProvider>
      <div>Dashboard</div>
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSession();
    useAuthStore.getState().clearAuth();
  });

  it("renders children while bootstrapping the session", () => {
    refreshSessionMock.mockResolvedValue({
      access: "access-token",
    });
    getProfileMock.mockResolvedValue({
      id: 10,
      user,
    });

    renderProvider();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("restores the authenticated user when refresh and profile succeed", async () => {
    refreshSessionMock.mockImplementation(async () => {
      setAccessToken("access-token");

      return {
        access: "access-token",
      };
    });

    getProfileMock.mockResolvedValue({
      id: 10,
      user,
    });

    renderProvider();

    await waitFor(() => {
      expect(useAuthStore.getState().user).toEqual(user);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(getProfileMock).toHaveBeenCalledTimes(1);
  });

  it("clears auth state when refresh fails", async () => {
    setAccessToken("old-access-token");
    useAuthStore.getState().setUser(user);

    refreshSessionMock.mockRejectedValue(new Error("Refresh failed"));

    renderProvider();

    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(getProfileMock).not.toHaveBeenCalled();
  });

  it("clears auth state when profile loading fails", async () => {
    setAccessToken("old-access-token");
    useAuthStore.getState().setUser(user);

    refreshSessionMock.mockResolvedValue({
      access: "new-access-token",
    });
    getProfileMock.mockRejectedValue(new Error("Profile failed"));

    renderProvider();

    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(getProfileMock).toHaveBeenCalledTimes(1);
  });
});
