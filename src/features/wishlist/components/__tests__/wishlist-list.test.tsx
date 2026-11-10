import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { WishlistItem } from "../../types";
import { WishlistList } from "../wishlist-list";

const endpoint = API_ENDPOINTS.products.wishlist;
const item = (id: number): WishlistItem => ({
  id,
  product: id,
  product_name: `Product ${id}`,
  product_price: "1200000",
  product_image: null,
  created_at: "2026-09-04T18:00:00Z",
});
const dataset = Array.from({ length: 21 }, (_, index) => item(index + 1));
let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe("WishlistList server pages", () => {
  it("shows server count and makes records beyond20 reachable without fetching every page", async () => {
    mock.onGet(endpoint).reply((config) => {
      const second = config.params.page === 2;
      expect(config.params.page_size).toBe(20);
      return [
        200,
        {
          count: 21,
          next: second ? null : "?page=2",
          previous: second ? "?page=1" : null,
          results: second ? dataset.slice(20) : dataset.slice(0, 20),
        },
      ];
    });
    render(<WishlistList />);
    expect(await screen.findByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("21 saved products")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.queryByText("Product 21")).not.toBeInTheDocument();
    expect(mock.history.get).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Product 21")).toBeInTheDocument();
    expect(screen.queryByText("Product 1")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(await screen.findByText("Product 1")).toBeInTheDocument();
    expect(mock.history.get.map((request) => request.params.page)).toEqual([
      1, 2, 1,
    ]);
  });

  it("returns to a valid page after deleting the last item on page2", async () => {
    let removed = false;
    mock.onGet(endpoint).reply((config) => [
      200,
      {
        count: removed ? 20 : 21,
        next: !removed && config.params.page === 1 ? "?page=2" : null,
        previous: config.params.page === 2 ? "?page=1" : null,
        results: config.params.page === 2 ? [item(21)] : dataset.slice(0, 20),
      },
    ]);
    mock.onDelete(API_ENDPOINTS.products.wishlistItem(21)).reply(() => {
      removed = true;
      return [204];
    });
    render(<WishlistList />);
    await screen.findByText("Product 1");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Product 21");
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("20 saved products")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(mock.history.delete).toHaveLength(1);
  });

  it("shows an empty state using the server count", async () => {
    mock
      .onGet(endpoint)
      .reply(200, { count: 0, next: null, previous: null, results: [] });
    render(<WishlistList />);
    expect(
      await screen.findByText("Your wishlist is empty"),
    ).toBeInTheDocument();
    expect(screen.getByText("0 saved products")).toBeInTheDocument();
  });

  it("does not mislabel old rows as a failed new page and allows retry", async () => {
    let failed = true;
    mock.onGet(endpoint).reply((config) =>
      config.params.page === 2 && failed
        ? [503, { detail: "Try later" }]
        : [
            200,
            {
              count: 21,
              next: config.params.page === 1 ? "?page=2" : null,
              previous: config.params.page === 2 ? "?page=1" : null,
              results:
                config.params.page === 1 ? dataset.slice(0, 20) : [item(21)],
            },
          ],
    );
    render(<WishlistList />);
    await screen.findByText("Product 1");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText(/Request failed with status code 503/);
    expect(screen.queryByText("Product 1")).not.toBeInTheDocument();
    failed = false;
    await userEvent.click(
      screen.getByRole("button", { name: "Retry wishlist" }),
    );
    expect(await screen.findByText("Product 21")).toBeInTheDocument();
    await waitFor(() => expect(mock.history.get).toHaveLength(3));
  });
});
