import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/auth-store";

import { addToWishlist, getWishlist, removeWishlistItem } from "../../api";
import { WishlistButton } from "../wishlist-button";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("../../api", () => ({
  getWishlist: vi.fn(),
  addToWishlist: vi.fn(),
  removeWishlistItem: vi.fn(),
}));

const mockedGetWishlist = vi.mocked(getWishlist);
const mockedAddToWishlist = vi.mocked(addToWishlist);
const mockedRemoveWishlistItem = vi.mocked(removeWishlistItem);

describe("WishlistButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.push.mockClear();

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isBootstrapped: true,
    });
  });

  it("redirects unauthenticated users to auth page", async () => {
    const user = userEvent.setup();

    render(<WishlistButton productId={10} />);

    await user.click(screen.getByRole("button", { name: /add to wishlist/i }));

    expect(routerMock.push).toHaveBeenCalledWith("/auth");
    expect(mockedAddToWishlist).not.toHaveBeenCalled();
  });

  it("adds product to wishlist", async () => {
    const user = userEvent.setup();

    useAuthStore.setState({
      user: {
        id: 1,
        email: "sina@example.com",
        phone: null,
        full_name: "Sina Moghtader Far",
        is_seller: false,
        email_verified: true,
      },
      isAuthenticated: true,
      isLoading: false,
      isBootstrapped: true,
    });

    mockedGetWishlist.mockResolvedValue([]);
    mockedAddToWishlist.mockResolvedValue({
      id: 5,
      product: 10,
      product_name: "Keyboard",
      product_price: "1200000",
      product_image: null,
      created_at: "2026-09-04T18:00:00Z",
    });

    render(<WishlistButton productId={10} />);

    await user.click(screen.getByRole("button", { name: /add to wishlist/i }));

    await waitFor(() => {
      expect(mockedAddToWishlist).toHaveBeenCalledWith({ product: 10 });
    });

    expect(
      await screen.findByRole("button", { name: /remove from wishlist/i }),
    ).toBeInTheDocument();
  });

  it("loads existing wishlist item and removes it", async () => {
    const user = userEvent.setup();

    useAuthStore.setState({
      user: {
        id: 1,
        email: "sina@example.com",
        phone: null,
        full_name: "Sina Moghtader Far",
        is_seller: false,
        email_verified: true,
      },
      isAuthenticated: true,
      isLoading: false,
      isBootstrapped: true,
    });

    mockedGetWishlist.mockResolvedValue([
      {
        id: 5,
        product: 10,
        product_name: "Keyboard",
        product_price: "1200000",
        product_image: null,
        created_at: "2026-09-04T18:00:00Z",
      },
    ]);
    mockedRemoveWishlistItem.mockResolvedValue();

    render(<WishlistButton productId={10} />);

    await user.click(
      await screen.findByRole("button", { name: /remove from wishlist/i }),
    );

    await waitFor(() => {
      expect(mockedRemoveWishlistItem).toHaveBeenCalledWith(5);
    });

    expect(
      await screen.findByRole("button", { name: /add to wishlist/i }),
    ).toBeInTheDocument();
  });

  it("shows wishlist error", async () => {
    const user = userEvent.setup();

    useAuthStore.setState({
      user: {
        id: 1,
        email: "sina@example.com",
        phone: null,
        full_name: "Sina Moghtader Far",
        is_seller: false,
        email_verified: true,
      },
      isAuthenticated: true,
      isLoading: false,
      isBootstrapped: true,
    });

    mockedGetWishlist.mockResolvedValue([]);
    mockedAddToWishlist.mockRejectedValue(new Error("Wishlist failed."));

    render(<WishlistButton productId={10} />);

    await user.click(screen.getByRole("button", { name: /add to wishlist/i }));

    expect(await screen.findByText("Wishlist failed.")).toBeInTheDocument();
  });
});
