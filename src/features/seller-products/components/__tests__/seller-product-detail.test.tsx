import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductDetail } from "@/features/products/types";

import { deleteSellerProduct, getSellerProduct } from "../../api";
import { SellerProductDetail } from "../seller-product-detail";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

const paramsMock = vi.hoisted(() => ({
  id: "10",
}));

vi.mock("next/navigation", () => ({
  useParams: () => paramsMock,
  useRouter: () => routerMock,
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

vi.mock("../../api", () => ({
  getSellerProduct: vi.fn(),
  deleteSellerProduct: vi.fn(),
}));

const mockedGetSellerProduct = vi.mocked(getSellerProduct);
const mockedDeleteSellerProduct = vi.mocked(deleteSellerProduct);

function makeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 10,
    name: "Seller Demo Product",
    slug: "seller-demo-product",
    description: "Demo product created by seller.",
    short_description: "Seller demo",
    price: "1200000",
    compare_price: "1500000",
    final_price: "1200000",
    cost_per_item: null,
    seller_name: "Sina Moghtader Far",
    seller_email: "sina@example.com",
    category: 1,
    category_name: "Accessories",
    brand: 2,
    brand_name: "Keychron",
    brand_logo: null,
    sku: "SELLER-DEMO-001",
    stock: 0,
    available_stock: 4,
    reserved_stock: 1,
    is_in_stock: true,
    low_stock_threshold: 5,
    weight: null,
    length: null,
    width: null,
    height: null,
    status: "pending",
    is_active: true,
    is_featured: false,
    images: [],
    variants: [],
    attributes: [],
    tags: [],
    average_rating: "0.00",
    reviews_count: 0,
    views_count: 7,
    created_at: "2026-08-28T08:00:00Z",
    updated_at: "2026-08-28T08:00:00Z",
    barcode: "1234567890",
    labels: [],
    label_display: [],
    ...overrides,
  };
}

describe("SellerProductDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.push.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders seller product details", async () => {
    mockedGetSellerProduct.mockResolvedValue(makeProduct());

    render(<SellerProductDetail />);

    expect(await screen.findByText("Seller Demo Product")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("Seller demo")).toBeInTheDocument();
    expect(screen.getByText("SELLER-DEMO-001")).toBeInTheDocument();
    expect(screen.getByText("Accessories")).toBeInTheDocument();
    expect(screen.getByText("Keychron")).toBeInTheDocument();
    expect(screen.getByText("1234567890")).toBeInTheDocument();
    expect(
      screen.getByText("Demo product created by seller."),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /edit product/i })).toHaveAttribute(
      "href",
      "/seller/products/10/edit",
    );
  });

  it("deletes product and redirects back to products list", async () => {
    const user = userEvent.setup();

    mockedGetSellerProduct.mockResolvedValue(makeProduct());
    mockedDeleteSellerProduct.mockResolvedValue();

    render(<SellerProductDetail />);

    await user.click(
      await screen.findByRole("button", { name: /delete product/i }),
    );

    await waitFor(() => {
      expect(mockedDeleteSellerProduct).toHaveBeenCalledWith("10");
    });

    expect(routerMock.push).toHaveBeenCalledWith("/seller/products");
  });

  it("does not delete product when confirmation is cancelled", async () => {
    const user = userEvent.setup();

    vi.mocked(window.confirm).mockReturnValue(false);
    mockedGetSellerProduct.mockResolvedValue(makeProduct());

    render(<SellerProductDetail />);

    await user.click(
      await screen.findByRole("button", { name: /delete product/i }),
    );

    expect(mockedDeleteSellerProduct).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("shows delete error", async () => {
    const user = userEvent.setup();

    mockedGetSellerProduct.mockResolvedValue(makeProduct());
    mockedDeleteSellerProduct.mockRejectedValue(
      new Error("Product could not be deleted."),
    );

    render(<SellerProductDetail />);

    await user.click(
      await screen.findByRole("button", { name: /delete product/i }),
    );

    expect(
      await screen.findByText("Product could not be deleted."),
    ).toBeInTheDocument();
  });

  it("shows load error", async () => {
    mockedGetSellerProduct.mockRejectedValue(
      new Error("Product is not available."),
    );

    render(<SellerProductDetail />);

    expect(
      await screen.findByText(/could not load seller product/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Product is not available.")).toBeInTheDocument();
  });
});
