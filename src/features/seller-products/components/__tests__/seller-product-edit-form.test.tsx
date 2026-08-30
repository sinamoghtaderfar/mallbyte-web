import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductDetail } from "@/features/products/types";

import {
  getSellerProduct,
  getSellerProductOptions,
  updateSellerProduct,
} from "../../api";
import { SellerProductEditForm } from "../seller-product-edit-form";

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
  getSellerProductOptions: vi.fn(),
  updateSellerProduct: vi.fn(),
}));

const mockedGetSellerProduct = vi.mocked(getSellerProduct);
const mockedGetSellerProductOptions = vi.mocked(getSellerProductOptions);
const mockedUpdateSellerProduct = vi.mocked(updateSellerProduct);

const options = {
  categories: [
    {
      id: 1,
      name: "Accessories",
      slug: "accessories",
      parent: null,
      parent_name: null,
      description: "",
      image: null,
      is_active: true,
      order: 1,
      created_at: "2026-08-28T08:00:00Z",
    },
  ],
  brands: [
    {
      id: 2,
      name: "Keychron",
      slug: "keychron",
      logo: null,
      description: "",
      website: "",
      is_active: true,
      created_at: "2026-08-28T08:00:00Z",
    },
  ],
};

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
    barcode: null,
    labels: [],
    label_display: [],
    ...overrides,
  };
}

describe("SellerProductEditForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.push.mockClear();
  });

  it("loads product values into edit form", async () => {
    mockedGetSellerProduct.mockResolvedValue(makeProduct());
    mockedGetSellerProductOptions.mockResolvedValue(options);

    render(<SellerProductEditForm />);

    expect(
      await screen.findByDisplayValue("Seller Demo Product"),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Demo product created by seller."),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Seller demo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1200000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1500000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("SELLER-DEMO-001")).toBeInTheDocument();
  });

  it("updates product and redirects to detail page", async () => {
    const user = userEvent.setup();

    mockedGetSellerProduct.mockResolvedValue(makeProduct());
    mockedGetSellerProductOptions.mockResolvedValue(options);
    mockedUpdateSellerProduct.mockResolvedValue(
      makeProduct({
        name: "Updated Seller Product",
        price: "1300000",
      }),
    );

    render(<SellerProductEditForm />);

    const nameInput = await screen.findByLabelText(/product name/i);
    const descriptionInput = screen.getByLabelText(/^description$/i);
    const priceInput = screen.getByLabelText(/^price$/i);

    await user.clear(nameInput);
    await user.type(nameInput, "Updated Seller Product");

    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Updated description");

    await user.clear(priceInput);
    await user.type(priceInput, "1300000");

    await user.click(screen.getByRole("button", { name: /save product/i }));

    await waitFor(() => {
      expect(mockedUpdateSellerProduct).toHaveBeenCalledWith("10", {
        name: "Updated Seller Product",
        description: "Updated description",
        short_description: "Seller demo",
        price: "1300000",
        compare_price: "1500000",
        cost_per_item: null,
        category: 1,
        brand: 2,
        sku: "SELLER-DEMO-001",
        low_stock_threshold: 5,
        weight: null,
        length: null,
        width: null,
        height: null,
        barcode: null,
        labels: [],
      });
    });

    expect(routerMock.push).toHaveBeenCalledWith("/seller/products/10");
  });

  it("shows load error", async () => {
    mockedGetSellerProduct.mockRejectedValue(
      new Error("Product could not be loaded."),
    );
    mockedGetSellerProductOptions.mockResolvedValue(options);

    render(<SellerProductEditForm />);

    expect(
      await screen.findByText(/could not load product edit form/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Product could not be loaded."),
    ).toBeInTheDocument();
  });

  it("shows update error", async () => {
    const user = userEvent.setup();

    mockedGetSellerProduct.mockResolvedValue(makeProduct());
    mockedGetSellerProductOptions.mockResolvedValue(options);
    mockedUpdateSellerProduct.mockRejectedValue(
      new Error("SKU already exists."),
    );

    render(<SellerProductEditForm />);

    await user.click(
      await screen.findByRole("button", { name: /save product/i }),
    );

    expect(await screen.findByText("SKU already exists.")).toBeInTheDocument();
  });
});
