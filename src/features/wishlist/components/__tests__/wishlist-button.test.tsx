import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/auth-store";
import type { PaginatedResponse } from "@/types/api";
import { addToWishlist, getWishlistPage, removeWishlistItem } from "../../api";
import type { WishlistItem } from "../../types";
import { WishlistButton } from "../wishlist-button";

const routerMock = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));
vi.mock("../../api", () => ({
  getWishlistPage: vi.fn(),
  addToWishlist: vi.fn(),
  removeWishlistItem: vi.fn(),
}));
const getPage = vi.mocked(getWishlistPage);
const add = vi.mocked(addToWishlist);
const remove = vi.mocked(removeWishlistItem);
const item = (id: number): WishlistItem => ({
  id,
  product: id,
  product_name: `Product ${id}`,
  product_price: "1200000",
  product_image: null,
  created_at: "2026-09-04T18:00:00Z",
});
const page = (
  results: WishlistItem[],
  count = results.length,
  next: string | null = null,
): PaginatedResponse<WishlistItem> => ({
  count,
  next,
  previous: null,
  results,
});
function authenticate() {
  useAuthStore.setState({
    user: {
      id: 1,
      email: "customer@example.test",
      phone: null,
      full_name: "Customer",
      is_seller: false,
      email_verified: true,
    },
    isAuthenticated: true,
    isLoading: false,
    isBootstrapped: true,
  });
}

describe("WishlistButton", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isBootstrapped: true,
    });
  });

  it("redirects unauthenticated customers without checking or changing wishlist", async () => {
    const user = userEvent.setup();
    render(<WishlistButton productId={10} />);
    await user.click(screen.getByRole("button", { name: "Add to wishlist" }));
    expect(routerMock.push).toHaveBeenCalledWith("/auth");
    expect(getPage).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it("adds only when the bounded lookup establishes absence", async () => {
    authenticate();
    getPage.mockResolvedValue(page([]));
    add.mockResolvedValue(item(10));
    render(<WishlistButton productId={10} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Add to wishlist" }),
    );
    expect(add).toHaveBeenCalledWith({ product: 10 });
    expect(
      await screen.findByRole("button", { name: "Remove from wishlist" }),
    ).toBeInTheDocument();
  });

  it("loads an existing item and removes its actual wishlist id", async () => {
    authenticate();
    getPage.mockResolvedValue(page([{ ...item(10), id: 500 }]));
    remove.mockResolvedValue();
    render(<WishlistButton productId={10} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Remove from wishlist" }),
    );
    expect(remove).toHaveBeenCalledWith(500);
    expect(
      await screen.findByRole("button", { name: "Add to wishlist" }),
    ).toBeInTheDocument();
  });

  it("keeps an add failure visible without claiming that the product was saved", async () => {
    authenticate();
    getPage.mockResolvedValue(page([]));
    add.mockRejectedValue(new Error("Wishlist failed."));
    render(<WishlistButton productId={10} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Add to wishlist" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Wishlist failed.",
    );
    expect(
      screen.getByRole("button", { name: "Add to wishlist" }),
    ).toBeInTheDocument();
  });

  it("does not infer absence or automatically scan when the product is beyond page one", async () => {
    authenticate();
    const dataset = Array.from({ length: 21 }, (_, index) => item(index + 1));
    getPage
      .mockResolvedValueOnce(
        page(dataset.slice(0, 20), 21, "/api/products/wishlist/?page=2"),
      )
      .mockResolvedValueOnce(page(dataset.slice(20), 21));
    render(<WishlistButton productId={21} />);
    await screen.findByRole("button", { name: "Check more saved items" });
    expect(screen.getByText(/Checked 20 of 21/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add to wishlist" }),
    ).not.toBeInTheDocument();
    expect(getPage).toHaveBeenCalledTimes(1);
    expect(add).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Check more saved items" }),
    );
    expect(getPage).toHaveBeenLastCalledWith(2);
    expect(
      await screen.findByRole("button", { name: "Remove from wishlist" }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Remove from wishlist" }),
    );
    expect(remove).toHaveBeenCalledWith(21);
  });

  it("allows adding an absent product only after the customer explicitly checks the final page", async () => {
    authenticate();
    getPage
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 20 }, (_, i) => item(i + 1)),
          21,
          "?page=2",
        ),
      )
      .mockResolvedValueOnce(page([item(21)], 21));
    render(<WishlistButton productId={99} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Check more saved items" }),
    );
    expect(
      await screen.findByRole("button", { name: "Add to wishlist" }),
    ).toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
  });

  it("keeps failed membership checks unknown and retries the same bounded page", async () => {
    authenticate();
    getPage
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 20 }, (_, i) => item(i + 1)),
          21,
          "?page=2",
        ),
      )
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValueOnce(page([item(21)], 21));
    render(<WishlistButton productId={21} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Check more saved items" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Unavailable");
    expect(
      screen.queryByRole("button", { name: "Add to wishlist" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Retry saved status" }),
    );
    expect(getPage).toHaveBeenLastCalledWith(2);
    expect(
      await screen.findByRole("button", { name: "Remove from wishlist" }),
    ).toBeInTheDocument();
  });

  it("ignores a previous product's late membership response", async () => {
    authenticate();
    let finish!: (value: PaginatedResponse<WishlistItem>) => void;
    getPage
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      )
      .mockResolvedValueOnce(page([]));
    const view = render(<WishlistButton productId={10} />);
    await waitFor(() => expect(getPage).toHaveBeenCalledTimes(1));
    view.rerender(<WishlistButton productId={11} />);
    await screen.findByRole("button", { name: "Add to wishlist" });
    finish(page([item(10)]));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add to wishlist" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Remove from wishlist" }),
    ).not.toBeInTheDocument();
  });

  it("restarts membership at page1 when a different product's initial check fails", async () => {
    authenticate();
    getPage
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 20 }, (_, index) => item(index + 1)),
          21,
          "?page=2",
        ),
      )
      .mockRejectedValueOnce(new Error("Temporary lookup failure"))
      .mockResolvedValueOnce(page([item(99)]));
    const view = render(<WishlistButton productId={21} />);
    await screen.findByRole("button", { name: "Check more saved items" });
    view.rerender(<WishlistButton productId={99} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Retry saved status" }),
    );
    await screen.findByRole("button", { name: "Remove from wishlist" });
    expect(getPage.mock.calls.map((call) => call[0])).toEqual([1, 1, 1]);
    expect(add).not.toHaveBeenCalled();
  });
});
