import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductImage } from "@/features/products/types";

import {
  createSellerProductImage,
  deleteSellerProductImage,
  getSellerProductImages,
} from "../../api";
import { SellerProductImagesManager } from "../seller-product-images-manager";

vi.mock("../../api", () => ({
  getSellerProductImages: vi.fn(),
  createSellerProductImage: vi.fn(),
  deleteSellerProductImage: vi.fn(),
}));

const mockedGetSellerProductImages = vi.mocked(getSellerProductImages);
const mockedCreateSellerProductImage = vi.mocked(createSellerProductImage);
const mockedDeleteSellerProductImage = vi.mocked(deleteSellerProductImage);

function makeImage(overrides: Partial<ProductImage> = {}): ProductImage {
  return {
    id: 1,
    image: "/media/products/keyboard.jpg",
    alt_text: "Keyboard front view",
    is_main: true,
    order: 0,
    created_at: "2026-09-02T20:00:00Z",
    ...overrides,
  };
}

describe("SellerProductImagesManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("loads and renders product images", async () => {
    mockedGetSellerProductImages.mockResolvedValue([
      makeImage(),
      makeImage({
        id: 2,
        alt_text: "Keyboard side view",
        is_main: false,
        order: 1,
      }),
    ]);

    render(<SellerProductImagesManager productId={10} />);

    expect(await screen.findByText("Keyboard front view")).toBeInTheDocument();
    expect(screen.getByText("Keyboard side view")).toBeInTheDocument();
    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.getByText("Order: 1")).toBeInTheDocument();

    expect(mockedGetSellerProductImages).toHaveBeenCalledWith("10");
  });

  it("shows empty state when product has no images", async () => {
    mockedGetSellerProductImages.mockResolvedValue([]);

    render(<SellerProductImagesManager productId={10} />);

    expect(await screen.findByText(/no images yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/upload the first product image/i),
    ).toBeInTheDocument();
  });

  it("uploads a product image and reloads images", async () => {
    const user = userEvent.setup();

    mockedGetSellerProductImages
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeImage()]);
    mockedCreateSellerProductImage.mockResolvedValue(makeImage());

    render(<SellerProductImagesManager productId={10} />);

    const file = new File(["image"], "keyboard.png", { type: "image/png" });

    await user.upload(screen.getByLabelText(/image file/i), file);
    await user.type(screen.getByLabelText(/alt text/i), "Keyboard front view");

    const orderInput = screen.getByLabelText(/order/i);
    await user.clear(orderInput);
    await user.type(orderInput, "2");

    await user.click(screen.getByLabelText(/set as main image/i));
    await user.click(screen.getByRole("button", { name: /upload image/i }));

    await waitFor(() => {
      expect(mockedCreateSellerProductImage).toHaveBeenCalledWith("10", {
        file,
        alt_text: "Keyboard front view",
        is_main: true,
        order: 2,
      });
    });

    expect(await screen.findByText("Keyboard front view")).toBeInTheDocument();
    expect(mockedGetSellerProductImages).toHaveBeenCalledTimes(2);
  });

  it("does not upload without selected file", async () => {
    const user = userEvent.setup();

    mockedGetSellerProductImages.mockResolvedValue([]);

    render(<SellerProductImagesManager productId={10} />);

    await user.click(screen.getByRole("button", { name: /upload image/i }));

    expect(
      await screen.findByText("Please select an image file."),
    ).toBeInTheDocument();
    expect(mockedCreateSellerProductImage).not.toHaveBeenCalled();
  });

  it("deletes an image and reloads images", async () => {
    const user = userEvent.setup();

    mockedGetSellerProductImages
      .mockResolvedValueOnce([makeImage()])
      .mockResolvedValueOnce([]);
    mockedDeleteSellerProductImage.mockResolvedValue();

    render(<SellerProductImagesManager productId={10} />);

    await user.click(await screen.findByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockedDeleteSellerProductImage).toHaveBeenCalledWith(1);
    });

    expect(await screen.findByText(/no images yet/i)).toBeInTheDocument();
  });

  it("does not delete when confirmation is cancelled", async () => {
    const user = userEvent.setup();

    vi.mocked(window.confirm).mockReturnValue(false);
    mockedGetSellerProductImages.mockResolvedValue([makeImage()]);

    render(<SellerProductImagesManager productId={10} />);

    await user.click(await screen.findByRole("button", { name: /delete/i }));

    expect(mockedDeleteSellerProductImage).not.toHaveBeenCalled();
  });

  it("shows load error", async () => {
    mockedGetSellerProductImages.mockRejectedValue(
      new Error("Images are not available."),
    );

    render(<SellerProductImagesManager productId={10} />);

    expect(
      await screen.findByText("Images are not available."),
    ).toBeInTheDocument();
  });
});
