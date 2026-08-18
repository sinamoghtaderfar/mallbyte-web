import { create } from "zustand";

import type { Cart } from "./types";

type CartState = {
  cart: Cart | null;
  totalItems: number;
  setCart: (cart: Cart | null) => void;
  clearCartState: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  totalItems: 0,

  setCart: (cart) =>
    set({
      cart,
      totalItems: cart?.total_items ?? 0,
    }),

  clearCartState: () =>
    set({
      cart: null,
      totalItems: 0,
    }),
}));
