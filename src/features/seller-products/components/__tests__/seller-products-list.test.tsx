import type { ReactNode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

function makeProduct(
  overrides: Partial<ProductListItem> = {},
): ProductListItem {
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
    mockedGetSellerProducts.mockResolvedValue({ count: 2, next: null, previous: null, results: [
      makeProduct(),
      makeProduct({
        id: 2,
        name: "Gaming Mouse",
        slug: "gaming-mouse",
        brand_name: "Logitech",
        final_price: "800000",
        available_stock: 3,
      }),
    ] });

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
    mockedGetSellerProducts.mockResolvedValue({count: 0, next: null, previous: null, results: []});

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

  const records = Array.from({ length: 21 }, (_, index) => makeProduct({
    id: index + 1, name: `Seller item ${index + 1}`,
  }));
  const firstPage = { count: 21, next: "?page=2", previous: null, results: records.slice(0, 20) };
  const lastPage = { count: 21, next: null, previous: "?page=1", results: records.slice(20) };

  it("makes all 21 products accessible with bounded server navigation and global counts", async () => {
    mockedGetSellerProducts.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(lastPage).mockResolvedValueOnce(firstPage);
    render(<SellerProductsList />);
    expect(await screen.findByText("Seller item 20")).toBeInTheDocument();
    expect(screen.queryByText("Seller item 21")).not.toBeInTheDocument();
    expect(mockedGetSellerProducts).toHaveBeenCalledTimes(1);
    expect(screen.getByText("21 products · Page 1 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next products" }));
    expect(await screen.findByText("Seller item 21")).toBeInTheDocument();
    expect(screen.queryByText("Seller item 1")).not.toBeInTheDocument();
    expect(mockedGetSellerProducts).toHaveBeenNthCalledWith(2, 2, expect.any(AbortSignal));
    expect(screen.getByRole("button", { name: "Next products" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous products" }));
    expect(await screen.findByText("Seller item 1")).toBeInTheDocument();
    expect(mockedGetSellerProducts).toHaveBeenCalledTimes(3);
  });

  it("retries a failed later page without skipping records", async () => {
    mockedGetSellerProducts.mockResolvedValueOnce(firstPage).mockRejectedValueOnce(new Error("Page unavailable")).mockResolvedValueOnce(lastPage);
    render(<SellerProductsList />);
    await screen.findByText("Seller item 1");
    fireEvent.click(screen.getByRole("button", { name: "Next products" }));
    await screen.findByText("Page unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry products" }));
    expect(await screen.findByText("Seller item 21")).toBeInTheDocument();
    expect(mockedGetSellerProducts).toHaveBeenNthCalledWith(3, 2, expect.any(AbortSignal));
  });

  it("ignores an old page completing after returning to the first page", async () => {
    let resolvePage!: (page: typeof lastPage) => void;
    mockedGetSellerProducts.mockResolvedValueOnce(firstPage)
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePage = resolve; }))
      .mockResolvedValueOnce(firstPage);
    render(<SellerProductsList />);
    await screen.findByText("Seller item 1");
    fireEvent.click(screen.getByRole("button", { name: "Next products" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous products" }));
    await screen.findByText("Seller item 1");
    await act(async () => resolvePage(lastPage));
    expect(screen.queryByText("Seller item 21")).not.toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Seller product pages" })).getByText("21 products · Page 1 of 2")).toBeInTheDocument();
  });
});
