import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SellerDashboardCard } from "../seller-dashboard-card";
import { getSellerDashboard } from "../../api";
import type { Seller } from "../../types";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("../../api", () => ({
  getSellerDashboard: vi.fn(),
}));

const mockedGetSellerDashboard = vi.mocked(getSellerDashboard);

function makeSeller(overrides: Partial<Seller> = {}): Seller {
  return {
    id: 1,
    user: {
      id: 1,
      email: "sina@example.com",
      phone: null,
      full_name: "Sina Moghtader Far",
      is_seller: true,
      email_verified: true,
    },
    store_name: "Sina Demo Store",
    store_slug: "sina-demo-store",
    logo: null,
    banner: null,
    description: "Demo seller account for MallByte",
    status: "approved",
    verified_at: "2026-08-25T08:00:00Z",
    business_phone: "+4917612345678",
    business_email: "store@example.com",
    website: "https://example.com",
    commission_rate: "10.00",
    total_sales: "2500000.00",
    total_orders: 12,
    balance: "500000.00",
    applied_at: "2026-08-24T08:00:00Z",
    created_at: "2026-08-24T08:00:00Z",
    ...overrides,
  };
}

describe("SellerDashboardCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders approved seller dashboard stats", async () => {
    mockedGetSellerDashboard.mockResolvedValue(makeSeller());

    render(<SellerDashboardCard />);

    expect(await screen.findByText("Sina Demo Store")).toBeInTheDocument();
    expect(screen.getByText("Demo seller account for MallByte")).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();

    expect(screen.getByText("2,500,000")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("500,000")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /edit store settings/i }),
    ).toHaveAttribute("href", "/seller/store");
  });

  it("shows an error when dashboard is not available", async () => {
    mockedGetSellerDashboard.mockRejectedValue(new Error("Seller is not approved."));

    render(<SellerDashboardCard />);

    expect(
      await screen.findByText(/seller dashboard is not available/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Seller is not approved.")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /check seller status/i }),
    ).toHaveAttribute("href", "/seller/status");
  });
});
