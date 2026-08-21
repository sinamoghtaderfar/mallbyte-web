import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductCard } from "../product-card";
import type { ProductListItem } from "../../types";

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

function makeProduct(
  overrides: Partial<ProductListItem> = {},
): ProductListItem {
  return {
    id: 42,
    name: "Mechanical Keyboard",
    slug: "mechanical-keyboard",
    main_image: null,
    price: "2100000.00",
    compare_price: null,
    final_price: "1900000.00",
    brand_name: "MallByte",
    category_name: "Accessories",
    stock: 10,
    available_stock: 8,
    reserved_stock: 2,
    is_featured: true,
    views_count: 15,
    created_at: "2026-08-21T00:00:00Z",
    barcode: null,
    labels: ["new"],
    label_display: ["New arrival"],
    ...overrides,
  };
}

describe("ProductCard", () => {
  it("renders product information and links to product detail by id", () => {
    render(<ProductCard product={makeProduct()} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/42");
    expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(screen.getByText(/MallByte · Accessories/i)).toBeInTheDocument();
    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByText("New arrival")).toBeInTheDocument();
    expect(screen.getByText("1,900,000")).toBeInTheDocument();
    expect(screen.getByText("Stock: 8")).toBeInTheDocument();
  });

  it("falls back to labels when label_display is empty", () => {
    render(
      <ProductCard
        product={makeProduct({
          label_display: [],
          labels: ["discount", "limited"],
        })}
      />,
    );

    expect(screen.getByText("discount")).toBeInTheDocument();
    expect(screen.getByText("limited")).toBeInTheDocument();
  });

  it("shows fallback text when product has no image and unknown brand", () => {
    render(
      <ProductCard
        product={makeProduct({
          main_image: null,
          brand_name: null,
          category_name: null,
        })}
      />,
    );

    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.getByText("Unknown brand")).toBeInTheDocument();
  });
});
