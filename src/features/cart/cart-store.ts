import { create } from "zustand";
import { CanceledError } from "axios";
import {
  getSessionGeneration,
  isCurrentSession,
} from "@/lib/auth/session-storage";
import * as api from "./api";

import type { AddToCartPayload, Cart, UpdateCartItemPayload } from "./types";

let mutationQueue: Promise<void> = Promise.resolve();
let revision = 0;
let resetVersion = 0;
let readVersion = 0;

type CartState = {
  cart: Cart | null;
  totalItems: number;
  pendingMutations: number;
  needsReload: boolean;
  setCart: (cart: Cart | null) => void;
  clearCartState: () => void;
  loadCart: () => Promise<void>;
  addProduct: (payload: AddToCartPayload) => Promise<void>;
  updateItem: (id: number, payload: UpdateCartItemPayload) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  emptyCart: () => Promise<void>;
  checkoutCart: <T>(operation: () => Promise<T>) => Promise<T>;
};

export const useCartStore = create<CartState>((set) => {
  const publish = (cart: Cart | null) =>
    set({ cart, totalItems: cart?.total_items ?? 0, needsReload: false });
  function mutate(operation: () => Promise<Cart | null>): Promise<void> {
    const version = ++revision;
    const reset = resetVersion;
    const session = getSessionGeneration();
    set((state) => ({ pendingMutations: state.pendingMutations + 1 }));
    const current = () => reset === resetVersion && isCurrentSession(session);
    const request = mutationQueue
      .then(async () => {
        if (!current()) throw new CanceledError("The cart session changed.");
        try {
          const cart = await operation();
          if (!current()) throw new CanceledError("The cart session changed.");
          if (version === revision) publish(cart);
        } catch (error) {
          // A failed mutation may have reached the server. Reconcile the final
          // operation instead of leaving an earlier, discarded snapshot visible.
          if (current() && version === revision) {
            try {
              const cart = await api.getCart();
              if (current() && version === revision) publish(cart);
            } catch {
              if (current() && version === revision) set({ needsReload: true });
            }
          }
          throw error;
        }
      })
      .finally(() => {
        if (current())
          set((state) => ({
            pendingMutations: Math.max(0, state.pendingMutations - 1),
          }));
      });
    // Serialize server mutations as well as their snapshots. Failure must not
    // prevent a later queued removal/clear from running.
    mutationQueue = request.catch(() => undefined);
    return request;
  }

  return {
    cart: null,
    totalItems: 0,
    pendingMutations: 0,
    needsReload: false,

    setCart: publish,

    clearCartState: () => {
      revision += 1;
      resetVersion += 1;
      mutationQueue = Promise.resolve();
      set({
        cart: null,
        totalItems: 0,
        pendingMutations: 0,
        needsReload: false,
      });
    },
    loadCart: async () => {
      const reset = resetVersion;
      const session = getSessionGeneration();
      const read = ++readVersion;
      // New mutations can be queued while a previous request is awaited. Wait for
      // the entire current queue before reading, rather than racing those writes.
      let queue: Promise<void>;
      do {
        queue = mutationQueue;
        await queue;
        if (
          reset !== resetVersion ||
          read !== readVersion ||
          !isCurrentSession(session)
        )
          return;
      } while (queue !== mutationQueue);
      const version = revision;
      const current = () =>
        reset === resetVersion &&
        version === revision &&
        read === readVersion &&
        isCurrentSession(session);
      try {
        const cart = await api.getCart();
        if (current()) publish(cart);
      } catch (error) {
        if (current()) {
          set({ needsReload: true });
          throw error;
        }
      }
    },
    addProduct: (payload) => mutate(() => api.addToCart(payload)),
    updateItem: (id, payload) => mutate(() => api.updateCartItem(id, payload)),
    removeItem: (id) => mutate(() => api.removeCartItem(id)),
    emptyCart: () =>
      mutate(async () => {
        await api.clearCart();
        return null;
      }),
    checkoutCart: async <T>(operation: () => Promise<T>): Promise<T> => {
      let result!: T;
      // Checkout consumes the server cart, so its request and empty snapshot
      // must occupy the same intent queue as adds, updates, and removals.
      // mutate also cancels old-session results before exposing the order.
      await mutate(async () => {
        result = await operation();
        return null;
      });
      return result;
    },
  };
});
