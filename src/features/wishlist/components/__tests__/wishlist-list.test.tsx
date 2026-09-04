import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getWishlist, removeWishlistItem } from "../../api";
import { WishlistList } from "../wishlist-list";

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
  getWishlist: vi.fn(),
  removeWishlistItem: vi.fn(),
}));

const mockedGetWishlist = vi.mocked(getWishlist);
const mockedRemoveWishlistItem = vi.mocked(removeWishlistItem);

describe("WishlistList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders wishlist items", async () => {
    mockedGetWishlist.mockResolvedValue([
      {
        id: 1,
        product: 10,
        product_name: "Mechanical Keyboard",
        product_price: "1200000",
        product_image: null,
        created_at: "2026-09-04T18:00:00Z",
      },
    ]);

    render(<WishlistList />);

    expect(await screen.findByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(screen.getByText("1,200,000")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /mechanical keyboard/i }),
    ).toHaveAttribute("href", "/products/10");
  });

  it("shows empty state", async () => {
    mockedGetWishlist.mockResolvedValue([]);

    render(<WishlistList />);

    expect(
      await screen.findByText(/your wishlist is empty/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse products/i }),
    ).toHaveAttribute("href", "/products");
  });

  it("removes wishlist item", async () => {
    const user = userEvent.setup();

    mockedGetWishlist.mockResolvedValue([
      {
        id: 1,
        product: 10,
        product_name: "Mechanical Keyboard",
        product_price: "1200000",
        product_image: null,
        created_at: "2026-09-04T18:00:00Z",
      },
    ]);
    mockedRemoveWishlistItem.mockResolvedValue();

    render(<WishlistList />);

    await user.click(await screen.findByRole("button", { name: /remove/i }));

    await waitFor(() => {
      expect(mockedRemoveWishlistItem).toHaveBeenCalledWith(1);
    });

    expect(
      await screen.findByText(/your wishlist is empty/i),
    ).toBeInTheDocument();
  });

  it("shows load error", async () => {
    mockedGetWishlist.mockRejectedValue(
      new Error("Wishlist is not available."),
    );

    render(<WishlistList />);

    expect(
      await screen.findByText(/could not load wishlist/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Wishlist is not available.")).toBeInTheDocument();
  });
});
