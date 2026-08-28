import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductListItem } from "@/features/products/types";

import { getSellerProducts } from "../../api";
import { SellerProductsList } from "../seller-products-list";

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
  getSellerProducts: vi.fn(),
}));

const mockedGetSellerProducts = vi.mocked(getSellerProducts);

function makeProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: 1,
    name: "Mechanical Keyboard",
    slug: "mechanical-keyboard",
    main_image: null,
    price: "1200000",
    compare_price: null,
    final_price: "1200000",
    brand_name: "Keychron",
    category_name: "Accessories",
    stock: 0,
    available_stock: 0,
    reserved_stock: 0,
    is_featured: false,
    views_count: 4,
    created_at: "2026-08-28T08:00:00Z",
    barcode: null,
    labels: [],
    label_display: [],
    ...overrides,
  };
}

describe("SellerProductsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders seller products", async () => {
    mockedGetSellerProducts.mockResolvedValue([
      makeProduct(),
      makeProduct({
        id: 2,
        name: "Gaming Mouse",
        slug: "gaming-mouse",
        brand_name: "Logitech",
        final_price: "800000",
        available_stock: 3,
      }),
    ]);

    render(<SellerProductsList />);

    expect(await screen.findByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(screen.getByText("Gaming Mouse")).toBeInTheDocument();
    expect(screen.getByText("Accessories · Keychron")).toBeInTheDocument();
    expect(screen.getByText("3 available")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /new product/i })).toHaveAttribute(
      "href",
      "/seller/products/new",
    );
  });

  it("shows empty state when seller has no products", async () => {
    mockedGetSellerProducts.mockResolvedValue([]);

    render(<SellerProductsList />);

    expect(await screen.findByText(/no products yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/create your first seller product/i),
    ).toBeInTheDocument();
  });

  it("shows load error", async () => {
    mockedGetSellerProducts.mockRejectedValue(
      new Error("Seller products are not available."),
    );

    render(<SellerProductsList />);

    expect(
      await screen.findByText(/could not load seller products/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Seller products are not available."),
    ).toBeInTheDocument();
  });
});
