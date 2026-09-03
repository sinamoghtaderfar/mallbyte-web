import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductVariant } from "@/features/products/types";

import {
  createSellerProductVariant,
  deleteSellerProductVariant,
  getSellerProductVariants,
  updateSellerProductVariant,
} from "../../api";
import { SellerProductVariantsManager } from "../seller-product-variants-manager";

vi.mock("../../api", () => ({
  getSellerProductVariants: vi.fn(),
  createSellerProductVariant: vi.fn(),
  updateSellerProductVariant: vi.fn(),
  deleteSellerProductVariant: vi.fn(),
}));

const mockedGetSellerProductVariants = vi.mocked(getSellerProductVariants);
const mockedCreateSellerProductVariant = vi.mocked(createSellerProductVariant);
const mockedUpdateSellerProductVariant = vi.mocked(updateSellerProductVariant);
const mockedDeleteSellerProductVariant = vi.mocked(deleteSellerProductVariant);

function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: 1,
    name: "Red Switch",
    sku: "KB-RED-001",
    price: "1200000",
    compare_price: null,
    final_price: "1200000",
    stock: 5,
    is_default: true,
    created_at: "2026-09-03T18:00:00Z",
    ...overrides,
  };
}

describe("SellerProductVariantsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("loads and renders product variants", async () => {
    mockedGetSellerProductVariants.mockResolvedValue([
      makeVariant(),
      makeVariant({
        id: 2,
        name: "Brown Switch",
        sku: "KB-BROWN-001",
        stock: 3,
        is_default: false,
      }),
    ]);

    render(<SellerProductVariantsManager productId={10} />);

    expect(await screen.findByText("Red Switch")).toBeInTheDocument();
    expect(screen.getByText("Brown Switch")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText("SKU: KB-BROWN-001")).toBeInTheDocument();

    expect(mockedGetSellerProductVariants).toHaveBeenCalledWith("10");
  });

  it("shows empty state when product has no variants", async () => {
    mockedGetSellerProductVariants.mockResolvedValue([]);

    render(<SellerProductVariantsManager productId={10} />);

    expect(await screen.findByText(/no variants yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/create the first product variant/i),
    ).toBeInTheDocument();
  });

  it("creates a product variant and reloads variants", async () => {
    const user = userEvent.setup();

    mockedGetSellerProductVariants
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeVariant()]);
    mockedCreateSellerProductVariant.mockResolvedValue(makeVariant());

    render(<SellerProductVariantsManager productId={10} />);

    await user.type(
      await screen.findByLabelText(/variant name/i),
      "Red Switch",
    );
    await user.type(screen.getByLabelText(/sku/i), "KB-RED-001");
    await user.type(screen.getByLabelText(/^price$/i), "1200000");

    const stockInput = screen.getByLabelText(/stock/i);
    await user.clear(stockInput);
    await user.type(stockInput, "5");

    await user.click(screen.getByLabelText(/default variant/i));
    await user.click(screen.getByRole("button", { name: /create variant/i }));

    await waitFor(() => {
      expect(mockedCreateSellerProductVariant).toHaveBeenCalledWith("10", {
        name: "Red Switch",
        sku: "KB-RED-001",
        price: "1200000",
        compare_price: null,
        stock: 5,
        is_default: true,
      });
    });

    expect(await screen.findByText("Red Switch")).toBeInTheDocument();
    expect(mockedGetSellerProductVariants).toHaveBeenCalledTimes(2);
  });

  it("loads a variant into edit mode and updates it", async () => {
    const user = userEvent.setup();

    mockedGetSellerProductVariants
      .mockResolvedValueOnce([makeVariant()])
      .mockResolvedValueOnce([
        makeVariant({
          name: "Updated Red Switch",
          price: "1300000",
        }),
      ]);

    mockedUpdateSellerProductVariant.mockResolvedValue(
      makeVariant({
        name: "Updated Red Switch",
        price: "1300000",
      }),
    );

    render(<SellerProductVariantsManager productId={10} />);

    await user.click(await screen.findByRole("button", { name: /edit/i }));

    const nameInput = screen.getByLabelText(/variant name/i);
    const priceInput = screen.getByLabelText(/^price$/i);

    await user.clear(nameInput);
    await user.type(nameInput, "Updated Red Switch");

    await user.clear(priceInput);
    await user.type(priceInput, "1300000");

    await user.click(screen.getByRole("button", { name: /save variant/i }));

    await waitFor(() => {
      expect(mockedUpdateSellerProductVariant).toHaveBeenCalledWith(1, {
        name: "Updated Red Switch",
        sku: "KB-RED-001",
        price: "1300000",
        compare_price: null,
        stock: 5,
        is_default: true,
      });
    });

    expect(await screen.findByText("Updated Red Switch")).toBeInTheDocument();
  });

  it("deletes a variant and reloads variants", async () => {
    const user = userEvent.setup();

    mockedGetSellerProductVariants
      .mockResolvedValueOnce([makeVariant()])
      .mockResolvedValueOnce([]);
    mockedDeleteSellerProductVariant.mockResolvedValue();

    render(<SellerProductVariantsManager productId={10} />);

    const variantRow = await screen.findByText("Red Switch");
    const row = variantRow.closest(".grid");

    await user.click(
      within(row as HTMLElement).getByRole("button", { name: /delete/i }),
    );

    await waitFor(() => {
      expect(mockedDeleteSellerProductVariant).toHaveBeenCalledWith(1);
    });

    expect(await screen.findByText(/no variants yet/i)).toBeInTheDocument();
  });

  it("does not delete when confirmation is cancelled", async () => {
    const user = userEvent.setup();

    vi.mocked(window.confirm).mockReturnValue(false);
    mockedGetSellerProductVariants.mockResolvedValue([makeVariant()]);

    render(<SellerProductVariantsManager productId={10} />);

    await user.click(await screen.findByRole("button", { name: /delete/i }));

    expect(mockedDeleteSellerProductVariant).not.toHaveBeenCalled();
  });

  it("shows load error", async () => {
    mockedGetSellerProductVariants.mockRejectedValue(
      new Error("Variants are not available."),
    );

    render(<SellerProductVariantsManager productId={10} />);

    expect(
      await screen.findByText("Variants are not available."),
    ).toBeInTheDocument();
  });
});
