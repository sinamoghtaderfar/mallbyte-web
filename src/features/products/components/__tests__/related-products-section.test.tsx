import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRelatedProducts } from "../../api";
import type { ProductListItem } from "../../types";
import { RelatedProductsSection } from "../related-products-section";

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
  getRelatedProducts: vi.fn(),
}));

const mockedGetRelatedProducts = vi.mocked(getRelatedProducts);

function makeProduct(
  overrides: Partial<ProductListItem> = {},
): ProductListItem {
  return {
    id: 20,
    name: "Related Mouse",
    slug: "related-mouse",
    main_image: null,
    price: "800000",
    compare_price: null,
    final_price: "800000",
    brand_name: "Logitech",
    category_name: "Accessories",
    stock: 10,
    available_stock: 6,
    reserved_stock: 4,
    is_featured: false,
    views_count: 5,
    created_at: "2026-09-06T18:00:00Z",
    barcode: null,
    labels: [],
    label_display: [],
    ...overrides,
  };
}

describe("RelatedProductsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and renders related products", async () => {
    mockedGetRelatedProducts.mockResolvedValue([
      makeProduct(),
      makeProduct({
        id: 21,
        name: "Related Headset",
        slug: "related-headset",
      }),
    ]);

    render(<RelatedProductsSection productId={10} />);

    expect(await screen.findByText("Related Mouse")).toBeInTheDocument();
    expect(screen.getByText("Related Headset")).toBeInTheDocument();
    expect(mockedGetRelatedProducts).toHaveBeenCalledWith("10");
  });

  it("shows empty state", async () => {
    mockedGetRelatedProducts.mockResolvedValue([]);

    render(<RelatedProductsSection productId={10} />);

    expect(
      await screen.findByText(/no related products yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/related products will appear here/i),
    ).toBeInTheDocument();
  });

  it("shows load error", async () => {
    mockedGetRelatedProducts.mockRejectedValue(
      new Error("Related products failed."),
    );

    render(<RelatedProductsSection productId={10} />);

    expect(
      await screen.findByText("Related products failed."),
    ).toBeInTheDocument();
  });
});
