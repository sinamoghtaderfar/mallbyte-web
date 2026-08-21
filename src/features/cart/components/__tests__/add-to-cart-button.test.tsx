import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/auth-store";
import { useCartStore } from "@/features/cart/cart-store";
import type { Cart } from "@/features/cart/types";

import { AddToCartButton } from "../add-to-cart-button";
import { addToCart } from "../../api";

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("../../api", () => ({
  addToCart: vi.fn(),
}));

const mockedAddToCart = vi.mocked(addToCart);

const cart: Cart = {
  id: 1,
  user: 1,
  total_items: 1,
  subtotal: "2100000.00",
  created_at: "2026-08-21T00:00:00Z",
  updated_at: "2026-08-21T00:00:00Z",
  items: [
    {
      id: 10,
      product: 12,
      product_name: "Keyboard",
      product_sku: "KB-001",
      product_price: "2100000.00",
      available_stock: 5,
      quantity: 1,
      unit_price: "2100000.00",
      total_price: "2100000.00",
      created_at: "2026-08-21T00:00:00Z",
      updated_at: "2026-08-21T00:00:00Z",
    },
  ],
};

function resetStores() {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isBootstrapped: true,
  });

  useCartStore.setState({
    cart: null,
    totalItems: 0,
  });
}

describe("AddToCartButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStores();
  });

  it("redirects unauthenticated users to auth page", async () => {
    const user = userEvent.setup();

    render(<AddToCartButton productId={12} />);

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(pushMock).toHaveBeenCalledWith("/auth");
    expect(mockedAddToCart).not.toHaveBeenCalled();
  });

  it("adds product to cart and redirects to cart for authenticated users", async () => {
    const user = userEvent.setup();

    useAuthStore.setState({
      user: {
        id: 1,
        email: "sina@example.com",
        phone: null,
        full_name: "Sina Moghtaderfar",
        is_seller: false,
        email_verified: true,
      },
      isAuthenticated: true,
      isLoading: false,
      isBootstrapped: true,
    });

    mockedAddToCart.mockResolvedValue(cart);

    render(<AddToCartButton productId={12} />);

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    await waitFor(() => {
      expect(mockedAddToCart).toHaveBeenCalledWith({
        product: 12,
        quantity: 1,
      });
    });

    expect(useCartStore.getState().cart).toEqual(cart);
    expect(useCartStore.getState().totalItems).toBe(1);
    expect(pushMock).toHaveBeenCalledWith("/cart");
  });

  it("shows API error when add to cart fails", async () => {
    const user = userEvent.setup();

    useAuthStore.setState({
      user: {
        id: 1,
        email: "sina@example.com",
        phone: null,
        full_name: "Sina Moghtaderfar",
        is_seller: false,
        email_verified: true,
      },
      isAuthenticated: true,
      isLoading: false,
      isBootstrapped: true,
    });

    mockedAddToCart.mockRejectedValue(new Error("Product is out of stock."));

    render(<AddToCartButton productId={12} />);

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(
      await screen.findByText("Product is out of stock."),
    ).toBeInTheDocument();
  });

  it("does not call API when button is disabled", async () => {
    const user = userEvent.setup();

    render(<AddToCartButton productId={12} disabled />);

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(mockedAddToCart).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
