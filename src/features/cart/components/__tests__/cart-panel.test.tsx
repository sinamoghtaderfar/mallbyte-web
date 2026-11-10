import type { ComponentProps } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCartStore } from "@/features/cart/cart-store";
import type { Cart } from "@/features/cart/types";

import { CartPanel } from "../cart-panel";
import { clearCart, getCart, removeCartItem, updateCartItem } from "../../api";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../../api", () => ({
  getCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  clearCart: vi.fn(),
}));

const mockedGetCart = vi.mocked(getCart);
const mockedUpdateCartItem = vi.mocked(updateCartItem);
const mockedRemoveCartItem = vi.mocked(removeCartItem);
const mockedClearCart = vi.mocked(clearCart);

function makeCart(overrides: Partial<Cart> = {}): Cart {
  return {
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
    ...overrides,
  };
}

describe("CartPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCartStore.getState().clearCartState();
  });

  it("renders empty cart state", async () => {
    mockedGetCart.mockResolvedValue(
      makeCart({
        total_items: 0,
        subtotal: "0.00",
        items: [],
      }),
    );

    render(<CartPanel />);

    expect(screen.getByText(/loading cart/i)).toBeInTheDocument();

    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse products/i }),
    ).toHaveAttribute("href", "/products");
  });

  it("renders cart items and summary", async () => {
    mockedGetCart.mockResolvedValue(makeCart());

    render(<CartPanel />);

    expect(await screen.findByText("Keyboard")).toBeInTheDocument();
    expect(screen.getByText("SKU: KB-001")).toBeInTheDocument();
    expect(screen.getByText("2,100,000 each")).toBeInTheDocument();
    expect(screen.getByText("1 item in cart")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /continue to checkout/i }),
    ).toHaveAttribute("href", "/checkout");
  });

  it("updates quantity", async () => {
    const user = userEvent.setup();

    mockedGetCart.mockResolvedValue(makeCart());
    mockedUpdateCartItem.mockResolvedValue(
      makeCart({
        total_items: 2,
        items: [
          {
            ...makeCart().items[0],
            quantity: 2,
            total_price: "4200000.00",
          },
        ],
      }),
    );

    render(<CartPanel />);

    expect(await screen.findByText("Keyboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+" }));

    await waitFor(() => {
      expect(mockedUpdateCartItem).toHaveBeenCalledWith(10, {
        quantity: 2,
      });
    });

    expect(useCartStore.getState().totalItems).toBe(2);
  });

  it("removes item from cart", async () => {
    const user = userEvent.setup();

    mockedGetCart.mockResolvedValue(makeCart());
    mockedRemoveCartItem.mockResolvedValue(
      makeCart({
        total_items: 0,
        subtotal: "0.00",
        items: [],
      }),
    );

    render(<CartPanel />);

    expect(await screen.findByText("Keyboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() => {
      expect(mockedRemoveCartItem).toHaveBeenCalledWith(10);
    });

    expect(useCartStore.getState().totalItems).toBe(0);
  });

  it("clears cart state", async () => {
    const user = userEvent.setup();

    mockedGetCart.mockResolvedValue(makeCart());
    mockedClearCart.mockResolvedValue(undefined);

    render(<CartPanel />);

    expect(await screen.findByText("Keyboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear cart/i }));

    await waitFor(() => {
      expect(mockedClearCart).toHaveBeenCalled();
    });

    expect(useCartStore.getState().cart).toBeNull();
    expect(useCartStore.getState().totalItems).toBe(0);
  });

  it("shows load error when cart cannot be loaded", async () => {
    mockedGetCart.mockRejectedValue(new Error("Could not load cart."));

    render(<CartPanel />);

    expect(
      await screen.findByRole("heading", { name: /could not load cart/i }),
    ).toBeInTheDocument();

    expect(screen.getByText("Could not load cart.")).toBeInTheDocument();
  });

  it("queues clear behind a pending quantity update and blocks checkout until completion", async () => {
    const user = userEvent.setup();
    let resolveUpdate!: (cart: Cart) => void;
    let resolveClear!: () => void;
    mockedGetCart.mockResolvedValue(makeCart());
    mockedUpdateCartItem.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    mockedClearCart.mockReturnValue(
      new Promise((resolve) => {
        resolveClear = resolve;
      }),
    );
    render(<CartPanel />);
    await screen.findByText("Keyboard");
    await user.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByRole("button", { name: /remove/i })).toBeDisabled();
    expect(
      screen.getByRole("link", { name: /continue to checkout/i }),
    ).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: /clear cart/i }));
    expect(screen.getByRole("button", { name: "Clearing…" })).toBeDisabled();
    expect(mockedClearCart).not.toHaveBeenCalled();
    await act(async () => {
      resolveUpdate(makeCart({ total_items: 2 }));
    });
    await waitFor(() => expect(mockedClearCart).toHaveBeenCalledOnce());
    expect(screen.getByText("1 item in cart")).toBeInTheDocument();
    await act(async () => {
      resolveClear();
    });
    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument();
    expect(useCartStore.getState().totalItems).toBe(0);
  });

  it("shows an empty cart after clear succeeds following a failed queued update", async () => {
    const user = userEvent.setup();
    let rejectUpdate!: (reason: unknown) => void;
    mockedGetCart.mockResolvedValue(makeCart());
    mockedUpdateCartItem.mockReturnValue(
      new Promise((_, reject) => {
        rejectUpdate = reject;
      }),
    );
    mockedClearCart.mockResolvedValue(undefined);
    render(<CartPanel />);
    await screen.findByText("Keyboard");
    await user.click(screen.getByRole("button", { name: "+" }));
    await user.click(screen.getByRole("button", { name: /clear cart/i }));
    await act(async () => {
      rejectUpdate(new Error("Old update failed"));
    });
    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.queryByText("Old update failed")).not.toBeInTheDocument();
  });

  it("prevents checkout after an unconfirmed mutation and supports an explicit reload", async () => {
    const user = userEvent.setup();
    mockedGetCart
      .mockResolvedValueOnce(makeCart())
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce(makeCart({ total_items: 2 }));
    mockedUpdateCartItem.mockRejectedValue(new Error("Update interrupted"));
    render(<CartPanel />);
    await screen.findByText("Keyboard");
    await user.click(screen.getByRole("button", { name: "+" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not be synchronized/i,
    );
    expect(
      screen.getByRole("link", { name: /continue to checkout/i }),
    ).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: /reload cart/i }));
    expect(await screen.findByText("2 items in cart")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /continue to checkout/i }),
    ).toHaveAttribute("aria-disabled", "false");
  });
});
