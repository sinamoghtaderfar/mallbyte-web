import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSellerProduct, getSellerProductOptions } from "../../api";
import { SellerProductCreateForm } from "../seller-product-create-form";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
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
  getSellerProductOptions: vi.fn(),
  createSellerProduct: vi.fn(),
}));

const mockedGetSellerProductOptions = vi.mocked(getSellerProductOptions);
const mockedCreateSellerProduct = vi.mocked(createSellerProduct);

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

describe("SellerProductCreateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.push.mockClear();
  });

  it("creates a seller product and redirects to products page", async () => {
    const user = userEvent.setup();

    mockedGetSellerProductOptions.mockResolvedValue(options);
    mockedCreateSellerProduct.mockResolvedValue({
      id: 10,
      name: "Mechanical Keyboard",
      description: "A compact mechanical keyboard.",
      short_description: "Compact keyboard",
      price: "1200000",
      compare_price: null,
      cost_per_item: null,
      category: 1,
      brand: 2,
      sku: "KB-001",
      low_stock_threshold: 3,
      weight: null,
      length: null,
      width: null,
      height: null,
      barcode: null,
      labels: [],
      stock: 0,
      available_stock: 0,
      reserved_stock: 0,
    });

    render(<SellerProductCreateForm />);

    await user.type(
      await screen.findByLabelText(/product name/i),
      "Mechanical Keyboard",
    );
    await user.type(
      screen.getByLabelText(/^description$/i),
      "A compact mechanical keyboard.",
    );
    await user.type(screen.getByLabelText(/short description/i), "Compact keyboard");

    await user.selectOptions(screen.getByLabelText(/category/i), "1");
    await user.selectOptions(screen.getByLabelText(/brand/i), "2");

    await user.type(screen.getByLabelText(/^price$/i), "1200000");
    await user.type(screen.getByLabelText(/sku/i), "KB-001");

    const lowStockInput = screen.getByLabelText(/low stock threshold/i);
    await user.clear(lowStockInput);
    await user.type(lowStockInput, "3");

    await user.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(mockedCreateSellerProduct).toHaveBeenCalledWith({
        name: "Mechanical Keyboard",
        description: "A compact mechanical keyboard.",
        short_description: "Compact keyboard",
        price: "1200000",
        compare_price: null,
        cost_per_item: null,
        category: 1,
        brand: 2,
        sku: "KB-001",
        low_stock_threshold: 3,
        weight: null,
        length: null,
        width: null,
        height: null,
        barcode: null,
        labels: [],
      });
    });

    expect(routerMock.push).toHaveBeenCalledWith("/seller/products");
  });

  it("shows option loading error", async () => {
    mockedGetSellerProductOptions.mockRejectedValue(
      new Error("Options are not available."),
    );

    render(<SellerProductCreateForm />);

    expect(
      await screen.findByText("Options are not available."),
    ).toBeInTheDocument();
  });

  it("shows create error", async () => {
    const user = userEvent.setup();

    mockedGetSellerProductOptions.mockResolvedValue(options);
    mockedCreateSellerProduct.mockRejectedValue(new Error("SKU already exists."));

    render(<SellerProductCreateForm />);

    await user.type(await screen.findByLabelText(/product name/i), "Keyboard");
    await user.type(screen.getByLabelText(/^description$/i), "Description");
    await user.selectOptions(screen.getByLabelText(/category/i), "1");
    await user.type(screen.getByLabelText(/^price$/i), "1000");
    await user.type(screen.getByLabelText(/sku/i), "KB-001");

    await user.click(screen.getByRole("button", { name: /create product/i }));

    expect(await screen.findByText("SKU already exists.")).toBeInTheDocument();
  });
});
