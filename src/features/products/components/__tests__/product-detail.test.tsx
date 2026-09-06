import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProduct, trackProductView } from "../../api";
import type { ProductDetail as ProductDetailType } from "../../types";
import { ProductDetail } from "../product-detail";

const paramsMock = vi.hoisted(() => ({
  id: "10",
}));

vi.mock("next/navigation", () => ({
  useParams: () => paramsMock,
}));

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

vi.mock("@/features/cart/components/add-to-cart-button", () => ({
  AddToCartButton: ({
    productId,
    disabled,
  }: {
    productId: number;
    disabled?: boolean;
  }) => <button disabled={disabled}>Add to cart product {productId}</button>,
}));

vi.mock("@/features/wishlist/components/wishlist-button", () => ({
  WishlistButton: ({ productId }: { productId: number }) => (
    <button>Add to wishlist product {productId}</button>
  ),
}));

vi.mock("../related-products-section", () => ({
  RelatedProductsSection: ({ productId }: { productId: number }) => (
    <div>Related products for {productId}</div>
  ),
}));

vi.mock("../../api", () => ({
  getProduct: vi.fn(),
  trackProductView: vi.fn(),
}));

const mockedGetProduct = vi.mocked(getProduct);
const mockedTrackProductView = vi.mocked(trackProductView);

function makeProduct(
  overrides: Partial<ProductDetailType> = {},
): ProductDetailType {
  return {
    id: 10,
    name: "Mechanical Keyboard",
    slug: "mechanical-keyboard",
    description: "A compact mechanical keyboard.",
    short_description: "Compact keyboard",
    price: "1200000",
    compare_price: "1500000",
    final_price: "1200000",
    cost_per_item: null,
    seller_name: "Sina Store",
    seller_email: "seller@example.com",
    category: 1,
    category_name: "Accessories",
    brand: 2,
    brand_name: "Keychron",
    brand_logo: null,
    sku: "KB-001",
    stock: 10,
    available_stock: 8,
    reserved_stock: 2,
    is_in_stock: true,
    low_stock_threshold: 5,
    weight: null,
    length: null,
    width: null,
    height: null,
    status: "approved",
    is_active: true,
    is_featured: true,
    images: [
      {
        id: 1,
        image: "/media/products/keyboard.jpg",
        alt_text: "Keyboard image",
        is_main: true,
        order: 0,
        created_at: "2026-09-06T18:00:00Z",
      },
    ],
    variants: [
      {
        id: 1,
        name: "Red Switch",
        sku: "KB-RED-001",
        price: "1200000",
        compare_price: null,
        final_price: "1200000",
        stock: 5,
        is_default: true,
        created_at: "2026-09-06T18:00:00Z",
      },
    ],
    attributes: [
      {
        attribute: "Switch",
        attribute_slug: "switch",
        value: "Red",
        value_slug: "red",
      },
    ],
    tags: [],
    average_rating: "4.50",
    reviews_count: 3,
    views_count: 12,
    created_at: "2026-09-06T18:00:00Z",
    updated_at: "2026-09-06T18:00:00Z",
    barcode: null,
    labels: ["new"],
    label_display: ["New"],
    ...overrides,
  };
}

describe("ProductDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedTrackProductView.mockResolvedValue({ views_count: 13 });
  });

  it("renders product detail and tracks product view", async () => {
    mockedGetProduct.mockResolvedValue(makeProduct());

    render(<ProductDetail />);

    expect(
      await screen.findByRole("heading", { name: "Mechanical Keyboard" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Keychron · Accessories")).toBeInTheDocument();
    expect(screen.getByText("Compact keyboard")).toBeInTheDocument();
    expect(screen.getAllByText("1,200,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1,500,000")).toBeInTheDocument();
    expect(screen.getByText("8 available")).toBeInTheDocument();
    expect(screen.getByText("12 views")).toBeInTheDocument();
    expect(screen.getByText("KB-001")).toBeInTheDocument();
    expect(screen.getByText("Sina Store")).toBeInTheDocument();
    expect(screen.getByText("4.50 / 5")).toBeInTheDocument();
    expect(screen.getByText("Red Switch")).toBeInTheDocument();
    expect(screen.getByText("Switch")).toBeInTheDocument();
    expect(screen.getByText("Related products for 10")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedTrackProductView).toHaveBeenCalledWith("10");
    });
  });

  it("still renders product when view tracking fails", async () => {
    mockedGetProduct.mockResolvedValue(makeProduct());
    mockedTrackProductView.mockRejectedValue(new Error("Tracking failed."));

    render(<ProductDetail />);

    expect(
      await screen.findByRole("heading", { name: "Mechanical Keyboard" }),
    ).toBeInTheDocument();

    expect(mockedTrackProductView).toHaveBeenCalledWith("10");
  });

  it("shows out of stock state and disables add to cart", async () => {
    mockedGetProduct.mockResolvedValue(
      makeProduct({
        is_in_stock: false,
        available_stock: 0,
      }),
    );

    render(<ProductDetail />);

    expect(await screen.findByText("Out of stock")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add to cart product 10/i }),
    ).toBeDisabled();
  });

  it("shows load error and does not track view", async () => {
    mockedGetProduct.mockRejectedValue(new Error("Product is not available."));

    render(<ProductDetail />);

    expect(
      await screen.findByText(/could not load product/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Product is not available.")).toBeInTheDocument();
    expect(mockedTrackProductView).not.toHaveBeenCalled();
  });
});
