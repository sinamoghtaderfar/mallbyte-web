import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProductFilters, getProducts } from "../../api";
import type { ProductListItem } from "../../types";
import { ProductList } from "../product-list";

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
  getProducts: vi.fn(),
  getProductFilters: vi.fn(),
}));

const mockedGetProducts = vi.mocked(getProducts);
const mockedGetProductFilters = vi.mocked(getProductFilters);

const filterOptions = {
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
      created_at: "2026-09-05T18:00:00Z",
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
      created_at: "2026-09-05T18:00:00Z",
    },
  ],
};

function makeProduct(
  overrides: Partial<ProductListItem> = {},
): ProductListItem {
  return {
    id: 10,
    name: "Mechanical Keyboard",
    slug: "mechanical-keyboard",
    main_image: null,
    price: "1200000",
    compare_price: "1500000",
    final_price: "1200000",
    brand_name: "Keychron",
    category_name: "Accessories",
    stock: 10,
    available_stock: 8,
    reserved_stock: 2,
    is_featured: false,
    views_count: 7,
    created_at: "2026-09-05T18:00:00Z",
    barcode: null,
    labels: ["new"],
    label_display: ["New"],
    ...overrides,
  };
}

function makeResponse(products: ProductListItem[]) {
  return {
    count: products.length,
    next: null,
    previous: null,
    results: products,
  };
}

describe("ProductList", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/products");
    vi.clearAllMocks();
    mockedGetProductFilters.mockResolvedValue(filterOptions);
  });

  it("loads filters and renders products", async () => {
    mockedGetProducts.mockResolvedValue(makeResponse([makeProduct()]));

    render(<ProductList />);

    expect(await screen.findByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(screen.getByText("1 product found")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Accessories" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Keychron" }),
    ).toBeInTheDocument();

    expect(mockedGetProducts).toHaveBeenCalledWith({});
  });

  it("applies catalog filters", async () => {
    const user = userEvent.setup();

    mockedGetProducts
      .mockResolvedValueOnce(makeResponse([]))
      .mockResolvedValueOnce(
        makeResponse([
          makeProduct({
            name: "Filtered Keyboard",
          }),
        ]),
      );

    render(<ProductList />);

    await screen.findByText(/no products yet/i);

    await user.type(screen.getByLabelText(/search products/i), "keyboard");
    await user.selectOptions(screen.getByLabelText(/category/i), "1");
    await user.selectOptions(screen.getByLabelText(/brand/i), "2");
    await user.type(screen.getByLabelText(/min price/i), "1000");
    await user.type(screen.getByLabelText(/max price/i), "2000");
    await user.selectOptions(screen.getByLabelText(/label/i), "new");
    await user.selectOptions(screen.getByLabelText(/sort by/i), "-price");
    await user.click(screen.getByLabelText(/in stock only/i));
    await user.click(screen.getByLabelText(/has discount/i));

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(mockedGetProducts).toHaveBeenLastCalledWith({
        search: "keyboard",
        category: "1",
        brand: "2",
        min_price: "1000",
        max_price: "2000",
        in_stock: "true",
        has_discount: "true",
        label: "new",
        ordering: "-price",
      });
    });

    expect(await screen.findByText("Filtered Keyboard")).toBeInTheDocument();
    expect(screen.getByText(/filters are active/i)).toBeInTheDocument();
  });

  it("clears active filters", async () => {
    const user = userEvent.setup();

    mockedGetProducts
      .mockResolvedValueOnce(makeResponse([]))
      .mockResolvedValueOnce(makeResponse([]))
      .mockResolvedValueOnce(makeResponse([makeProduct()]));

    render(<ProductList />);

    await screen.findByText(/no products yet/i);

    await user.type(screen.getByLabelText(/search products/i), "keyboard");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(mockedGetProducts).toHaveBeenLastCalledWith({
        search: "keyboard",
      });
    });

    await user.click(screen.getByRole("button", { name: /clear/i }));

    await waitFor(() => {
      expect(mockedGetProducts).toHaveBeenLastCalledWith({});
    });

    expect(await screen.findByText("Mechanical Keyboard")).toBeInTheDocument();
  });

  it("shows empty filtered state", async () => {
    const user = userEvent.setup();

    mockedGetProducts
      .mockResolvedValueOnce(makeResponse([makeProduct()]))
      .mockResolvedValueOnce(makeResponse([]));

    render(<ProductList />);

    await screen.findByText("Mechanical Keyboard");

    await user.type(screen.getByLabelText(/search products/i), "missing");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(
      await screen.findByText(/no products match your filters/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/try changing or clearing the current filters/i),
    ).toBeInTheDocument();
  });

  it("navigates paginated results and resets on a new filter", async () => {
    const user = userEvent.setup();
    mockedGetProducts.mockImplementation(async (params = {}) => ({
      count: 25,
      next: params.page === "2" ? null : "/api/products/products/?page=2",
      previous: params.page === "2" ? "/api/products/products/?page=1" : null,
      results: [makeProduct({ name: params.page === "2" ? "Second Page" : "First Page" })],
    }));
    render(<ProductList />);
    expect(await screen.findByText("First Page")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Second Page")).toBeInTheDocument();
    expect(mockedGetProducts).toHaveBeenCalledWith({ page: "2" });
    await user.type(screen.getByLabelText(/search products/i), "keyboard");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));
    await waitFor(() => expect(mockedGetProducts).toHaveBeenLastCalledWith({ search: "keyboard" }));
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
  });

  it("rejects an inverted price range without making a catalog request", async () => {
    const user = userEvent.setup();
    mockedGetProducts.mockResolvedValue(makeResponse([makeProduct()]));
    render(<ProductList />);
    await screen.findByText("Mechanical Keyboard");
    await user.type(screen.getByLabelText(/min price/i), "2000");
    await user.type(screen.getByLabelText(/max price/i), "1000");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));
    expect(screen.getByText(/Minimum price cannot exceed maximum price/)).toBeInTheDocument();
    expect(mockedGetProducts).toHaveBeenCalledTimes(1);
  });

  it("restores filters and page from a shared URL", async () => {
    window.history.replaceState(null, "", "/products?search=keyboard&page=2&page_size=12");
    mockedGetProducts.mockResolvedValue({
      count: 24,
      next: null,
      previous: "/products?page=1",
      results: [makeProduct({ name: "Shared Result" })],
    });
    render(<ProductList />);
    expect(await screen.findByText("Shared Result")).toBeInTheDocument();
    expect(screen.getByLabelText(/search products/i)).toHaveValue("keyboard");
    expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
    expect(mockedGetProducts).toHaveBeenCalledWith({ search: "keyboard", page: "2", page_size: "12" });
  });

  it("restores results on browser Back navigation", async () => {
    const user = userEvent.setup();
    mockedGetProducts.mockImplementation(async (params = {}) => ({
      count: 1, next: null, previous: null,
      results: [makeProduct({ name: params.search ? "Filtered Result" : "Unfiltered Result" })],
    }));
    render(<ProductList />);
    expect(await screen.findByText("Unfiltered Result")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/search products/i), "mouse");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));
    expect(await screen.findByText("Filtered Result")).toBeInTheDocument();
    expect(window.location.search).toContain("search=mouse");
    window.history.replaceState(null, "", "/products");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(await screen.findByText("Unfiltered Result")).toBeInTheDocument();
  });

  it("shows product loading error", async () => {
    mockedGetProducts.mockRejectedValue(
      new Error("Products are not available."),
    );

    render(<ProductList />);

    expect(
      await screen.findByText(/could not load products/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Products are not available.")).toBeInTheDocument();
  });

  it("shows filter loading error without blocking products", async () => {
    mockedGetProductFilters.mockRejectedValue(new Error("Filters failed."));
    mockedGetProducts.mockResolvedValue(makeResponse([makeProduct()]));

    render(<ProductList />);

    expect(await screen.findByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(screen.getByText("Filters failed.")).toBeInTheDocument();
  });
});
