import { describe, expect, it } from "vitest";

import { useAuthStore } from "@/features/auth/auth-store";
import { useCartStore } from "@/features/cart/cart-store";
import type { Cart } from "@/features/cart/types";

import {
  clearSession,
  getAccessToken,
  setAccessToken,
} from "../auth/session-storage";

const user = {
  id: 1,
  email: "sina@example.com",
  phone: null,
  full_name: "Sina Moghtaderfar",
  is_seller: false,
  email_verified: true,
};

const cart: Cart = {
  id: 1,
  user: 1,
  total_items: 2,
  subtotal: "2100000.00",
  created_at: "2026-08-21T00:00:00Z",
  updated_at: "2026-08-21T00:00:00Z",
  items: [
    {
      id: 10,
      product: 1,
      product_name: "Keyboard",
      product_sku: "KB-001",
      product_price: "1050000.00",
      available_stock: 5,
      quantity: 2,
      unit_price: "1050000.00",
      total_price: "2100000.00",
      created_at: "2026-08-21T00:00:00Z",
      updated_at: "2026-08-21T00:00:00Z",
    },
  ],
};

describe("session storage", () => {
  it("stores and clears the in-memory access token", () => {
    clearSession();

    expect(getAccessToken()).toBeNull();

    setAccessToken("access-token");

    expect(getAccessToken()).toBe("access-token");

    clearSession();

    expect(getAccessToken()).toBeNull();
  });
});

describe("auth store", () => {
  it("sets and clears authenticated user state", () => {
    useAuthStore.getState().setUser(user);

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

describe("cart store", () => {
  it("derives totalItems from the cart payload", () => {
    useCartStore.getState().clearCartState();

    useCartStore.getState().setCart(cart);

    expect(useCartStore.getState().cart).toEqual(cart);
    expect(useCartStore.getState().totalItems).toBe(2);
  });

  it("clears cart state", () => {
    useCartStore.getState().setCart(cart);
    useCartStore.getState().clearCartState();

    expect(useCartStore.getState().cart).toBeNull();
    expect(useCartStore.getState().totalItems).toBe(0);
  });
});
