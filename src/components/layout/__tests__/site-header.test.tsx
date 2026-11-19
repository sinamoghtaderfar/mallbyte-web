import type { ComponentProps, MouseEvent } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { logout } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth-store";
import type { AuthUser } from "@/features/auth/types";
import { getMyPermissions } from "@/features/rbac/api";
import { SiteHeader } from "../site-header";

const navigation = vi.hoisted(() => ({ pathname: "/products", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock("next/link", () => ({
  default: ({ href, onClick, ...props }: ComponentProps<"a">) => (
    <a {...props} href={href} onClick={(event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      event.preventDefault();
    }} />
  ),
}));
vi.mock("@/features/auth/api", () => ({ logout: vi.fn() }));
vi.mock("@/features/rbac/api", () => ({ getMyPermissions: vi.fn() }));
vi.mock("@/features/cart/components/cart-link", () => ({
  CartLink: () => <a href="/cart">Cart</a>,
}));
vi.mock("@/features/notifications/components/notification-bell", () => ({
  NotificationBell: () => <button type="button">Notifications</button>,
}));
vi.mock("@/features/content/components/cms-nav-links", () => ({ CmsNavLinks: () => null }));

const customer: AuthUser = {
  id: 7, email: "customer@example.test", full_name: "Alex Morgan", phone: null,
  is_seller: false, is_staff: false, is_superuser: false, email_verified: true,
};

function permissionResult(userId: number, permissions: string[] = []) {
  return { user_id: userId, email: `account-${userId}@example.test`, permissions, permissions_count: permissions.length };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  navigation.pathname = "/products";
  useAuthStore.setState({ user: null, isAuthenticated: false, isBootstrapped: true, isLoading: false });
  vi.mocked(getMyPermissions).mockReset();
  vi.mocked(getMyPermissions).mockResolvedValue(permissionResult(customer.id));
  vi.mocked(logout).mockReset();
});

describe("shared marketplace navigation", () => {
  it("opens with the keyboard, closes on Escape, and restores focus to the menu trigger", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    within(mobile).getByRole("link", { name: "Products" }).focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the mobile navigation after following a destination", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(within(mobile).getByRole("link", { name: "Addresses" })).toHaveAttribute("href", "/addresses");
    await user.click(within(mobile).getByRole("link", { name: "Products" }));
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
  });

  it("provides a native GET search and marks nested destinations current", () => {
    navigation.pathname = "/products/42";
    render(<SiteHeader />);
    const search = screen.getByRole("search", { name: "Marketplace search" });
    expect(search).toHaveAttribute("action", "/products");
    expect(search).toHaveAttribute("method", "get");
    expect(within(search).getByRole("searchbox", { name: "Search marketplace" })).toHaveAttribute("name", "search");
    expect(within(search).getByRole("button", { name: "Search" })).toHaveAttribute("type", "submit");
    const main = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(main).getByRole("link", { name: "Products" })).toHaveAttribute("aria-current", "page");
    expect(within(main).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(getMyPermissions).not.toHaveBeenCalled();
  });

  it("retains seller/admin visibility and shows privileged destinations only for the matching identity", async () => {
    useAuthStore.setState({ user: { ...customer, is_seller: true, is_staff: true }, isAuthenticated: true });
    vi.mocked(getMyPermissions).mockResolvedValue(permissionResult(customer.id, ["view_platform_analytics", "manage_content"]));
    render(<SiteHeader />);
    const main = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(main).getByRole("link", { name: "Seller" })).toHaveAttribute("href", "/seller/dashboard");
    expect(within(main).getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(await within(main).findByRole("link", { name: "Finance" })).toHaveAttribute("href", "/admin/financial");
    expect(within(main).getByRole("link", { name: "CMS" })).toHaveAttribute("href", "/admin/content");
  });

  it("does not expose another identity's permission response", async () => {
    useAuthStore.setState({ user: customer, isAuthenticated: true });
    vi.mocked(getMyPermissions).mockResolvedValue(permissionResult(99, ["view_platform_analytics", "manage_content"]));
    render(<SiteHeader />);
    await waitFor(() => expect(getMyPermissions).toHaveBeenCalledTimes(1));
    const main = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(main).queryByRole("link", { name: "Finance" })).not.toBeInTheDocument();
    expect(within(main).queryByRole("link", { name: "CMS" })).not.toBeInTheDocument();
    expect(within(main).queryByRole("link", { name: "Seller" })).not.toBeInTheDocument();
    expect(within(main).queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("ignores a previous account's late permissions after identity turnover", async () => {
    const old = deferred<Awaited<ReturnType<typeof getMyPermissions>>>();
    const next = { ...customer, id: 8, email: "next@example.test" };
    useAuthStore.setState({ user: customer, isAuthenticated: true });
    vi.mocked(getMyPermissions).mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(permissionResult(next.id));
    render(<SiteHeader />);
    await waitFor(() => expect(getMyPermissions).toHaveBeenCalledTimes(1));
    act(() => useAuthStore.setState({ user: next }));
    await waitFor(() => expect(getMyPermissions).toHaveBeenCalledTimes(2));
    await act(async () => old.resolve(permissionResult(customer.id, ["view_platform_analytics", "manage_content"])));
    const main = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(main).queryByRole("link", { name: "Finance" })).not.toBeInTheDocument();
    expect(within(main).queryByRole("link", { name: "CMS" })).not.toBeInTheDocument();
  });

  it("retains navigation to sign-in and failure feedback when remote logout fails", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ user: customer, isAuthenticated: true });
    vi.mocked(logout).mockRejectedValueOnce(new Error("Server sign-out unavailable"));
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/auth"));
    expect(screen.getByRole("alert")).toHaveTextContent("Server sign-out unavailable");
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
