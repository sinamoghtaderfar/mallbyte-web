import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearSession } from "@/lib/auth/session-storage";

import * as api from "../api";
import { useCartStore } from "../cart-store";
import type { Cart } from "../types";

vi.mock("../api", () => ({
  getCart: vi.fn(),
  addToCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  clearCart: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function cart(quantity = 1): Cart {
  return {
    id: 1,
    user: 1,
    total_items: quantity,
    subtotal: String(quantity * 10),
    created_at: "2026-11-08T00:00:00Z",
    updated_at: "2026-11-08T00:00:00Z",
    items: quantity
      ? [
          {
            id: 10,
            product: 1,
            product_name: "Keyboard",
            product_sku: "KB",
            product_price: "10",
            available_stock: 10,
            quantity,
            unit_price: "10",
            total_price: String(quantity * 10),
            created_at: "2026-11-08T00:00:00Z",
            updated_at: "2026-11-08T00:00:00Z",
          },
        ]
      : [],
  };
}

describe("cart request ordering", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useCartStore.getState().clearCartState();
    useCartStore.getState().setCart(cart());
  });

  it("serializes quantity, removal and clear intents without publishing superseded snapshots", async () => {
    const update = deferred<Cart>();
    const removal = deferred<Cart>();
    const clear = deferred<void>();
    vi.mocked(api.updateCartItem).mockReturnValue(update.promise);
    vi.mocked(api.removeCartItem).mockReturnValue(removal.promise);
    vi.mocked(api.clearCart).mockReturnValue(clear.promise);
    const quantities: number[] = [];
    const unsubscribe = useCartStore.subscribe((state) =>
      quantities.push(state.totalItems),
    );
    const updated = useCartStore.getState().updateItem(10, { quantity: 2 });
    const removed = useCartStore.getState().removeItem(10);
    const cleared = useCartStore.getState().emptyCart();

    await vi.waitFor(() => expect(api.updateCartItem).toHaveBeenCalledOnce());
    expect(api.removeCartItem).not.toHaveBeenCalled();
    expect(api.clearCart).not.toHaveBeenCalled();
    expect(useCartStore.getState().pendingMutations).toBe(3);

    update.resolve(cart(2));
    await updated;
    await vi.waitFor(() => expect(api.removeCartItem).toHaveBeenCalledWith(10));
    expect(api.clearCart).not.toHaveBeenCalled();
    expect(useCartStore.getState().totalItems).toBe(1);

    removal.resolve(cart(0));
    await removed;
    await vi.waitFor(() => expect(api.clearCart).toHaveBeenCalledOnce());
    expect(useCartStore.getState().totalItems).toBe(1);
    clear.resolve();
    await cleared;
    unsubscribe();

    expect(quantities).not.toContain(2);
    expect(useCartStore.getState()).toMatchObject({
      cart: null,
      totalItems: 0,
      pendingMutations: 0,
    });
  });

  it("preserves the order of concurrent quantity and add intents", async () => {
    const first = deferred<Cart>();
    const second = deferred<Cart>();
    vi.mocked(api.updateCartItem)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.mocked(api.addToCart).mockResolvedValue(cart(4));
    const updateOne = useCartStore.getState().updateItem(10, { quantity: 2 });
    const updateTwo = useCartStore.getState().updateItem(10, { quantity: 3 });
    const add = useCartStore.getState().addProduct({ product: 2, quantity: 1 });
    await vi.waitFor(() => expect(api.updateCartItem).toHaveBeenCalledTimes(1));
    expect(api.addToCart).not.toHaveBeenCalled();
    first.resolve(cart(2));
    await updateOne;
    await vi.waitFor(() => expect(api.updateCartItem).toHaveBeenCalledTimes(2));
    expect(api.updateCartItem).toHaveBeenNthCalledWith(2, 10, { quantity: 3 });
    second.resolve(cart(3));
    await Promise.all([updateTwo, add]);
    expect(useCartStore.getState().totalItems).toBe(4);
  });

  it("ignores an initial GET that finishes after clear", async () => {
    const initial = deferred<Cart>();
    vi.mocked(api.getCart).mockReturnValue(initial.promise);
    vi.mocked(api.clearCart).mockResolvedValue(undefined);
    const read = useCartStore.getState().loadCart();
    await vi.waitFor(() => expect(api.getCart).toHaveBeenCalledOnce());
    await useCartStore.getState().emptyCart();
    initial.resolve(cart(5));
    await read;
    expect(useCartStore.getState()).toMatchObject({
      cart: null,
      totalItems: 0,
    });
  });

  it("keeps the newest GET when responses finish in reverse order", async () => {
    const first = deferred<Cart>();
    const second = deferred<Cart>();
    vi.mocked(api.getCart)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const older = useCartStore.getState().loadCart();
    await vi.waitFor(() => expect(api.getCart).toHaveBeenCalledTimes(1));
    const newer = useCartStore.getState().loadCart();
    await vi.waitFor(() => expect(api.getCart).toHaveBeenCalledTimes(2));
    second.resolve(cart(3));
    await newer;
    first.resolve(cart(1));
    await older;
    expect(useCartStore.getState().totalItems).toBe(3);
  });

  it("waits for writes queued after a read began waiting", async () => {
    const update = deferred<Cart>();
    const clear = deferred<void>();
    vi.mocked(api.updateCartItem).mockReturnValue(update.promise);
    vi.mocked(api.clearCart).mockReturnValue(clear.promise);
    vi.mocked(api.getCart).mockResolvedValue(cart(0));
    const updating = useCartStore.getState().updateItem(10, { quantity: 2 });
    const reading = useCartStore.getState().loadCart();
    const clearing = useCartStore.getState().emptyCart();
    update.resolve(cart(2));
    await updating;
    await vi.waitFor(() => expect(api.clearCart).toHaveBeenCalledOnce());
    expect(api.getCart).not.toHaveBeenCalled();
    clear.resolve();
    await Promise.all([clearing, reading]);
    expect(api.getCart).toHaveBeenCalledOnce();
    expect(useCartStore.getState().totalItems).toBe(0);
  });

  it("continues a queued clear after an earlier update fails", async () => {
    const update = deferred<Cart>();
    vi.mocked(api.updateCartItem).mockReturnValue(update.promise);
    vi.mocked(api.clearCart).mockResolvedValue(undefined);
    const updating = useCartStore.getState().updateItem(10, { quantity: 2 });
    const rejected = expect(updating).rejects.toThrow("Update failed");
    const clearing = useCartStore.getState().emptyCart();
    update.reject(new Error("Update failed"));
    await Promise.all([rejected, clearing]);
    expect(api.getCart).not.toHaveBeenCalled();
    expect(api.clearCart).toHaveBeenCalledOnce();
    expect(useCartStore.getState()).toMatchObject({
      cart: null,
      totalItems: 0,
      pendingMutations: 0,
    });
  });

  it("reconciles a failed final mutation with authoritative server state", async () => {
    vi.mocked(api.updateCartItem).mockRejectedValue(
      new Error("Connection lost"),
    );
    vi.mocked(api.getCart).mockResolvedValue(cart(2));
    await expect(
      useCartStore.getState().updateItem(10, { quantity: 2 }),
    ).rejects.toThrow("Connection lost");
    expect(api.getCart).toHaveBeenCalledOnce();
    expect(useCartStore.getState()).toMatchObject({
      totalItems: 2,
      needsReload: false,
      pendingMutations: 0,
    });
  });

  it("requires reload when mutation reconciliation fails, then recovers", async () => {
    vi.mocked(api.removeCartItem).mockRejectedValue(
      new Error("Connection lost"),
    );
    vi.mocked(api.getCart)
      .mockRejectedValueOnce(new Error("Still offline"))
      .mockResolvedValueOnce(cart(0));
    await expect(useCartStore.getState().removeItem(10)).rejects.toThrow(
      "Connection lost",
    );
    expect(useCartStore.getState()).toMatchObject({
      totalItems: 1,
      needsReload: true,
      pendingMutations: 0,
    });
    await useCartStore.getState().loadCart();
    expect(useCartStore.getState()).toMatchObject({
      totalItems: 0,
      needsReload: false,
    });
  });

  it("drops old-session results and queued writes without disturbing a new session", async () => {
    const oldUpdate = deferred<Cart>();
    vi.mocked(api.updateCartItem).mockReturnValue(oldUpdate.promise);
    vi.mocked(api.addToCart).mockResolvedValue(cart(4));
    const updating = useCartStore.getState().updateItem(10, { quantity: 2 });
    const rejectedUpdate = expect(updating).rejects.toMatchObject({
      code: "ERR_CANCELED",
    });
    const clearing = useCartStore.getState().emptyCart();
    const rejectedClear = expect(clearing).rejects.toMatchObject({
      code: "ERR_CANCELED",
    });
    await vi.waitFor(() => expect(api.updateCartItem).toHaveBeenCalledOnce());

    clearSession();
    useCartStore.getState().clearCartState();
    await useCartStore.getState().addProduct({ product: 2, quantity: 4 });
    oldUpdate.resolve(cart(2));
    await Promise.all([rejectedUpdate, rejectedClear]);
    expect(api.clearCart).not.toHaveBeenCalled();
    expect(api.getCart).not.toHaveBeenCalled();
    expect(useCartStore.getState()).toMatchObject({
      totalItems: 4,
      pendingMutations: 0,
    });
  });

  it("does not replace a successful mutation with an obsolete read failure", async () => {
    const read = deferred<Cart>();
    vi.mocked(api.getCart).mockReturnValue(read.promise);
    vi.mocked(api.updateCartItem).mockResolvedValue(cart(2));
    const reading = useCartStore.getState().loadCart();
    await vi.waitFor(() => expect(api.getCart).toHaveBeenCalledOnce());
    await useCartStore.getState().updateItem(10, { quantity: 2 });
    read.reject(new Error("Old request failed"));
    await reading;
    expect(useCartStore.getState()).toMatchObject({
      totalItems: 2,
      needsReload: false,
    });
  });

  it("queues newer adds behind checkout and keeps their authoritative cart", async () => {
    const order = { id: 42 };
    const response = deferred<typeof order>();
    const addition = deferred<Cart>();
    const checkout = vi.fn(() => response.promise);
    vi.mocked(api.addToCart).mockReturnValue(addition.promise);

    const checkingOut = useCartStore.getState().checkoutCart(checkout);
    await vi.waitFor(() => expect(checkout).toHaveBeenCalledOnce());
    const adding = useCartStore.getState().addProduct({ product: 2, quantity: 2 });
    expect(api.addToCart).not.toHaveBeenCalled();
    expect(useCartStore.getState().pendingMutations).toBe(2);

    response.resolve(order);
    await expect(checkingOut).resolves.toEqual(order);
    await vi.waitFor(() => expect(api.addToCart).toHaveBeenCalledOnce());
    // An older checkout never publishes its empty snapshot over a newer intent.
    expect(useCartStore.getState().totalItems).toBe(1);
    expect(useCartStore.getState().pendingMutations).toBe(1);
    addition.resolve(cart(2));
    await adding;
    expect(useCartStore.getState()).toMatchObject({
      cart: cart(2),
      totalItems: 2,
      pendingMutations: 0,
      needsReload: false,
    });
  });

  it("waits for earlier writes before checkout and clears only its own completed intent", async () => {
    const update = deferred<Cart>();
    const order = { id: 42 };
    const checkout = vi.fn().mockResolvedValue(order);
    vi.mocked(api.updateCartItem).mockReturnValue(update.promise);
    const updating = useCartStore.getState().updateItem(10, { quantity: 2 });
    const checkingOut = useCartStore.getState().checkoutCart(checkout);

    await vi.waitFor(() => expect(api.updateCartItem).toHaveBeenCalledOnce());
    expect(checkout).not.toHaveBeenCalled();
    update.resolve(cart(2));
    await updating;
    await expect(checkingOut).resolves.toEqual(order);
    expect(useCartStore.getState()).toMatchObject({
      cart: null,
      totalItems: 0,
      pendingMutations: 0,
      needsReload: false,
    });
    expect(api.clearCart).not.toHaveBeenCalled();
  });

  it("retires a pre-checkout read instead of restoring the consumed cart", async () => {
    const staleRead = deferred<Cart>();
    vi.mocked(api.getCart).mockReturnValue(staleRead.promise);
    const reading = useCartStore.getState().loadCart();
    await vi.waitFor(() => expect(api.getCart).toHaveBeenCalledOnce());

    await useCartStore.getState().checkoutCart(async () => ({ id: 42 }));
    staleRead.resolve(cart(1));
    await reading;
    expect(useCartStore.getState()).toMatchObject({
      cart: null,
      totalItems: 0,
      needsReload: false,
    });
  });

  it("waits for checkout and subsequently queued writes before a cart reload", async () => {
    const order = deferred<{ id: number }>();
    const addition = deferred<Cart>();
    vi.mocked(api.addToCart).mockReturnValue(addition.promise);
    vi.mocked(api.getCart).mockResolvedValue(cart(3));

    const checkingOut = useCartStore.getState().checkoutCart(() => order.promise);
    const reading = useCartStore.getState().loadCart();
    const adding = useCartStore.getState().addProduct({ product: 2, quantity: 3 });
    order.resolve({ id: 42 });
    await checkingOut;
    await vi.waitFor(() => expect(api.addToCart).toHaveBeenCalledOnce());
    expect(api.getCart).not.toHaveBeenCalled();
    addition.resolve(cart(3));
    await Promise.all([adding, reading]);
    expect(api.getCart).toHaveBeenCalledOnce();
    expect(useCartStore.getState().totalItems).toBe(3);
  });

  it("reconciles an ambiguous checkout failure with the server cart", async () => {
    vi.mocked(api.getCart).mockResolvedValue(cart(0));
    const checkout = vi.fn().mockRejectedValue(new Error("Response lost"));

    await expect(useCartStore.getState().checkoutCart(checkout)).rejects.toThrow(
      "Response lost",
    );
    expect(api.getCart).toHaveBeenCalledOnce();
    expect(useCartStore.getState()).toMatchObject({
      cart: cart(0),
      totalItems: 0,
      pendingMutations: 0,
      needsReload: false,
    });
  });

  it("requires a reload when checkout and its reconciliation both fail", async () => {
    vi.mocked(api.getCart).mockRejectedValue(new Error("Still offline"));
    const checkout = vi.fn().mockRejectedValue(new Error("Response lost"));

    await expect(useCartStore.getState().checkoutCart(checkout)).rejects.toThrow(
      "Response lost",
    );
    expect(useCartStore.getState()).toMatchObject({
      cart: cart(1),
      totalItems: 1,
      pendingMutations: 0,
      needsReload: true,
    });
  });

  it("runs newer cart writes after a failed checkout without resetting their queue", async () => {
    const order = deferred<{ id: number }>();
    vi.mocked(api.addToCart).mockResolvedValue(cart(3));
    const checkingOut = useCartStore.getState().checkoutCart(() => order.promise);
    const rejected = expect(checkingOut).rejects.toThrow("Checkout failed");
    const adding = useCartStore.getState().addProduct({ product: 2, quantity: 2 });

    order.reject(new Error("Checkout failed"));
    await Promise.all([rejected, adding]);
    expect(api.getCart).not.toHaveBeenCalled();
    expect(api.addToCart).toHaveBeenCalledOnce();
    expect(useCartStore.getState()).toMatchObject({
      totalItems: 3,
      pendingMutations: 0,
      needsReload: false,
    });
  });

  it("cancels old-session checkout completion and its queued writes", async () => {
    const order = deferred<{ id: number }>();
    const checkout = vi.fn(() => order.promise);
    const checkingOut = useCartStore.getState().checkoutCart(checkout);
    const rejectedCheckout = expect(checkingOut).rejects.toMatchObject({
      code: "ERR_CANCELED",
    });
    const oldAdding = useCartStore.getState().addProduct({ product: 2, quantity: 2 });
    const rejectedAdd = expect(oldAdding).rejects.toMatchObject({
      code: "ERR_CANCELED",
    });
    await vi.waitFor(() => expect(checkout).toHaveBeenCalledOnce());

    clearSession();
    useCartStore.getState().clearCartState();
    vi.mocked(api.addToCart).mockResolvedValue(cart(4));
    await useCartStore.getState().addProduct({ product: 3, quantity: 4 });
    order.resolve({ id: 42 });
    await Promise.all([rejectedCheckout, rejectedAdd]);
    expect(api.addToCart).toHaveBeenCalledOnce();
    expect(api.addToCart).toHaveBeenCalledWith({ product: 3, quantity: 4 });
    expect(api.getCart).not.toHaveBeenCalled();
    expect(useCartStore.getState()).toMatchObject({
      totalItems: 4,
      pendingMutations: 0,
      needsReload: false,
    });
  });

  it("does not issue a queued checkout for a different session", async () => {
    const update = deferred<Cart>();
    vi.mocked(api.updateCartItem).mockReturnValue(update.promise);
    const updating = useCartStore.getState().updateItem(10, { quantity: 2 });
    const rejectedUpdate = expect(updating).rejects.toMatchObject({
      code: "ERR_CANCELED",
    });
    const checkout = vi.fn().mockResolvedValue({ id: 42 });
    const checkingOut = useCartStore.getState().checkoutCart(checkout);
    const rejectedCheckout = expect(checkingOut).rejects.toMatchObject({
      code: "ERR_CANCELED",
    });
    await vi.waitFor(() => expect(api.updateCartItem).toHaveBeenCalledOnce());

    clearSession();
    useCartStore.getState().clearCartState();
    useCartStore.getState().setCart(cart(4));
    update.resolve(cart(2));
    await Promise.all([rejectedUpdate, rejectedCheckout]);
    expect(checkout).not.toHaveBeenCalled();
    expect(api.getCart).not.toHaveBeenCalled();
    expect(useCartStore.getState()).toMatchObject({
      totalItems: 4,
      pendingMutations: 0,
    });
  });
});
