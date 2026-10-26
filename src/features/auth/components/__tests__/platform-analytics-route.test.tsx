import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMyPermissions } from "@/features/rbac/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { PlatformAnalyticsRoute } from "../platform-analytics-route";

vi.mock("@/features/rbac/api", () => ({ getMyPermissions: vi.fn() }));
const permissions = vi.mocked(getMyPermissions);
const makeUser = (id: number) => ({
  id, email: `${id}@example.test`, phone: null, full_name: `Test ${id}`,
  is_seller: false, email_verified: true,
});

beforeEach(() => {
  vi.resetAllMocks();
  act(() => {
    useAuthStore.getState().clearAuth();
    useAuthStore.getState().setBootstrapped(true);
    useAuthStore.getState().setLoading(false);
  });
});

describe("PlatformAnalyticsRoute", () => {
  it("does not render sensitive content until permissions are confirmed", async () => {
    let grant!: (value: Awaited<ReturnType<typeof getMyPermissions>>) => void;
    permissions.mockImplementation(() => new Promise((resolve) => { grant = resolve; }));
    act(() => { useAuthStore.getState().setUser(makeUser(1)); });
    render(<PlatformAnalyticsRoute><div>Private numbers</div></PlatformAnalyticsRoute>);
    expect(screen.queryByText("Private numbers")).toBeNull();
    await act(async () => grant({ user_id: 1, email: "1@example.test", permissions: ["view_platform_analytics"], permissions_count: 1 }));
    expect(await screen.findByText("Private numbers")).toBeTruthy();
  });

  it("never reuses a previous user's permission decision", async () => {
    permissions.mockResolvedValueOnce({ user_id: 1, email: "1@example.test", permissions: ["view_platform_analytics"], permissions_count: 1 });
    let deny!: (value: Awaited<ReturnType<typeof getMyPermissions>>) => void;
    permissions.mockImplementationOnce(() => new Promise((resolve) => { deny = resolve; }));
    act(() => { useAuthStore.getState().setUser(makeUser(1)); });
    render(<PlatformAnalyticsRoute><div>Private numbers</div></PlatformAnalyticsRoute>);
    expect(await screen.findByText("Private numbers")).toBeTruthy();
    act(() => { useAuthStore.getState().setUser(makeUser(2)); });
    expect(screen.queryByText("Private numbers")).toBeNull();
    await act(async () => deny({ user_id: 2, email: "2@example.test", permissions: [], permissions_count: 0 }));
    expect(await screen.findByText("Access denied")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Private numbers")).toBeNull());
  });
});
