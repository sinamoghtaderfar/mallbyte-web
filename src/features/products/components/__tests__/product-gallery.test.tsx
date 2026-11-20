import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ProductImage as ProductImageData } from "../../types";
import { ProductGallery } from "../product-gallery";
import { ProductImage } from "../product-image";

const images: ProductImageData[] = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  image: `/media/view-${index + 1}.jpg`,
  alt_text: `Carryall view ${index + 1}`,
  is_main: index === 1,
  order: index,
  created_at: "2026-11-01T12:00:00Z",
}));

describe("product image gallery", () => {
  it("starts on the designated main image and makes every supplied image reachable by keyboard", async () => {
    const user = userEvent.setup();
    render(<ProductGallery productName="Canvas carryall" images={images} />);
    expect(
      screen.getByRole("img", { name: "Carryall view 2" }),
    ).toHaveAttribute("src", expect.stringContaining("view-2.jpg"));
    expect(screen.getAllByRole("button")).toHaveLength(6);
    const last = screen.getByRole("button", {
      name: "View image 6 of Canvas carryall",
    });
    last.focus();
    await user.keyboard("{Enter}");
    expect(last).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "View image 2 of Canvas carryall" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("img", { name: "Carryall view 6" }),
    ).toHaveAttribute("src", expect.stringContaining("view-6.jpg"));
    expect(screen.getByText("Image 6 of 6")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("resets selection for a different product and falls back when selected media is removed", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ProductGallery key="one" productName="Carryall" images={images} />,
    );
    await user.click(
      screen.getByRole("button", { name: "View image 6 of Carryall" }),
    );
    rerender(
      <ProductGallery
        key="two"
        productName="Another carryall"
        images={images}
      />,
    );
    expect(
      screen.getByRole("img", { name: "Carryall view 2" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "View image 6 of Another carryall" }),
    );
    rerender(
      <ProductGallery
        key="two"
        productName="Another carryall"
        images={images.slice(0, 2)}
      />,
    );
    expect(
      screen.getByRole("img", { name: "Carryall view 2" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Image 2 of 2")).toBeInTheDocument();
  });

  it("provides useful missing-media text without creating empty gallery controls", () => {
    render(<ProductGallery productName="Canvas carryall" images={[]} />);
    expect(
      screen.getByRole("img", { name: "Canvas carryall — image unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a stable fallback after an image failure and can render a replacement source", () => {
    const { rerender } = render(
      <ProductImage src="/broken.jpg" alt="Canvas carryall" />,
    );
    fireEvent.error(screen.getByRole("img"));
    expect(
      screen.getByRole("img", { name: "Canvas carryall — image unavailable" }),
    ).toBeInTheDocument();
    rerender(<ProductImage src="/replacement.jpg" alt="Canvas carryall" />);
    expect(
      screen.getByRole("img", { name: "Canvas carryall" }),
    ).toHaveAttribute("src", "/replacement.jpg");
  });
});
