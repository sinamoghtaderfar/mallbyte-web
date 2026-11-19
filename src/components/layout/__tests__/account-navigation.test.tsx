import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccountNavigation } from "../account-navigation";

const navigation = vi.hoisted(() => ({ pathname: "/orders/42" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

beforeEach(() => {
  navigation.pathname = "/orders/42";
  useAuthStore.setState({ isAuthenticated: true });
});

describe("account navigation context", () => {
  it("marks only the parent destination current for a nested account route", () => {
    render(<AccountNavigation />);
    const nav = screen.getByRole("navigation", { name: "Account navigation" });
    expect(within(nav).getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(within(nav).getByRole("link", { name: "Addresses" })).toHaveAttribute("href", "/addresses");
    expect(within(nav).getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/notifications");
  });

  it("keeps support conversation routes within their account context", () => {
    navigation.pathname = "/support/tickets/18";
    render(<AccountNavigation />);
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute("aria-current", "page");
  });

  it.each(["/products", "/seller/orders", "/admin/super", "/orders-export"])(
    "does not insert account navigation into %s", (pathname) => {
      navigation.pathname = pathname;
      render(<AccountNavigation />);
      expect(screen.queryByRole("navigation", { name: "Account navigation" })).not.toBeInTheDocument();
    },
  );

  it("does not expose private account navigation while signed out", () => {
    useAuthStore.setState({ isAuthenticated: false });
    render(<AccountNavigation />);
    expect(screen.queryByRole("navigation", { name: "Account navigation" })).not.toBeInTheDocument();
  });
});
