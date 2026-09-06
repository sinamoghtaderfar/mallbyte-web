import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRecentlyViewedProducts } from "@/features/products/api";

import { RecentlyViewedList } from "../recently-viewed-list";

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

vi.mock("@/features/products/api", () => ({
  getRecentlyViewedProducts: vi.fn(),
}));

const mockedGetRecentlyViewedProducts = vi.mocked(getRecentlyViewedProducts);

describe("RecentlyViewedList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders recently viewed products", async () => {
    mockedGetRecentlyViewedProducts.mockResolvedValue([
      {
        id: 1,
        product: 10,
        product_name: "Mechanical Keyboard",
        product_price: "1200000",
        product_image: null,
        viewed_at: "2026-09-06T18:00:00Z",
      },
    ]);

    render(<RecentlyViewedList />);

    expect(await screen.findByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(screen.getByText("1,200,000")).toBeInTheDocument();
    expect(screen.getByText(/viewed at/i)).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /mechanical keyboard/i }),
    ).toHaveAttribute("href", "/products/10");
  });

  it("shows empty state", async () => {
    mockedGetRecentlyViewedProducts.mockResolvedValue([]);

    render(<RecentlyViewedList />);

    expect(
      await screen.findByText(/no recently viewed products/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse products/i }),
    ).toHaveAttribute("href", "/products");
  });

  it("shows load error", async () => {
    mockedGetRecentlyViewedProducts.mockRejectedValue(
      new Error("Recently viewed failed."),
    );

    render(<RecentlyViewedList />);

    expect(
      await screen.findByText(/could not load recently viewed products/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Recently viewed failed.")).toBeInTheDocument();
  });
});
