import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getSellerOrders } from "../api";
import { SellerOrdersList } from "../components/seller-orders-list";
import type { SellerOrderListItem } from "../types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const endpoint = API_ENDPOINTS.sellerOrders.orders;
const mock = new MockAdapter(apiClient);
const orders: SellerOrderListItem[] = Array.from({ length: 21 }, (_, index) => ({
  id: index + 1,
  order_number: `SELLER-${index + 1}`,
  status: "paid",
  status_display: "Paid",
  seller_status: "processing",
  seller_status_display: "Processing",
  payment_status: "paid",
  payment_status_display: "Paid",
  seller_items_count: 1,
  seller_total_amount: "1000",
  created_at: "2026-11-01T12:00:00Z",
  paid_at: "2026-11-01T12:00:00Z",
  delivered_at: null,
}));
function page(number: number) {
  return {
    count: orders.length,
    next: number === 1 ? "?page=2" : null,
    previous: number === 2 ? "?page=1" : null,
    results: orders.slice((number - 1) * 20, number * 20),
  };
}
beforeEach(() => mock.reset());
afterEach(() => mock.reset());

describe("seller order page contracts", () => {
  it("preserves the current backend envelope and requests only one bounded page", async () => {
    mock.onGet(endpoint).reply(200, page(2));
    expect(await getSellerOrders(2)).toEqual(page(2));
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ page: 2, page_size: 20 });
  });

  it("keeps the legacy array response compatible during API rollout", async () => {
    mock.onGet(endpoint).reply(200, orders.slice(0, 1));
    expect(await getSellerOrders()).toEqual({ count: 1, next: null, previous: null, results: orders.slice(0, 1) });
  });

  it("renders actual backend pages and makes all 21 seller orders reachable", async () => {
    mock.onGet(endpoint).reply((config) => [200, page(config.params.page)]);
    render(<SellerOrdersList />);
    expect(await screen.findByText("SELLER-20")).toBeInTheDocument();
    expect(screen.queryByText("SELLER-21")).not.toBeInTheDocument();
    expect(screen.getByText("21 seller orders · Page 1 of 2")).toBeInTheDocument();
    expect(mock.history.get).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Next seller orders" }));
    expect(await screen.findByText("SELLER-21")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View details" })).toHaveAttribute("href", "/seller/orders/21");
    expect(screen.getByRole("button", { name: "Next seller orders" })).toBeDisabled();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(mock.history.get).toHaveLength(2);
    expect(mock.history.get[1].params).toEqual({ page: 2, page_size: 20 });
    fireEvent.click(screen.getByRole("button", { name: "Previous seller orders" }));
    expect(await screen.findByText("SELLER-1")).toBeInTheDocument();
    expect(mock.history.get).toHaveLength(3);
  });

  it("retries a failed later page without changing its target", async () => {
    let failed = false;
    mock.onGet(endpoint).reply((config) => {
      if (config.params.page === 2 && !failed) {
        failed = true;
        return [503, { detail: "Later page unavailable" }];
      }
      return [200, page(config.params.page)];
    });
    render(<SellerOrdersList />);
    await screen.findByText("SELLER-1");
    fireEvent.click(screen.getByRole("button", { name: "Next seller orders" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry seller orders" }));
    expect(await screen.findByText("SELLER-21")).toBeInTheDocument();
    expect(mock.history.get.map((request) => request.params.page)).toEqual([1, 2, 2]);
  });

  it("recovers an initial failure without losing the seller list", async () => {
    mock.onGet(endpoint).replyOnce(503, { detail: "Unavailable" });
    mock.onGet(endpoint).reply(200, page(1));
    render(<SellerOrdersList />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry seller orders" }));
    expect(await screen.findByText("SELLER-20")).toBeInTheDocument();
    expect(mock.history.get.map((request) => request.params.page)).toEqual([1, 1]);
  });

  it("retires a held later-page response after navigating back", async () => {
    let resolveLater!: (response: [number, ReturnType<typeof page>]) => void;
    mock.onGet(endpoint).reply((config) => config.params.page === 2
      ? new Promise<[number, ReturnType<typeof page>]>((resolve) => { resolveLater = resolve; })
      : [200, page(1)]);
    render(<SellerOrdersList />);
    await screen.findByText("SELLER-1");
    fireEvent.click(screen.getByRole("button", { name: "Next seller orders" }));
    await waitFor(() => expect(mock.history.get).toHaveLength(2));
    fireEvent.click(screen.getByRole("button", { name: "Previous seller orders" }));
    await screen.findByText("SELLER-1");
    await act(async () => resolveLater([200, page(2)]));
    expect(screen.queryByText("SELLER-21")).not.toBeInTheDocument();
    expect(screen.getByText("21 seller orders · Page 1 of 2")).toBeInTheDocument();
    expect(mock.history.get[1].signal?.aborted).toBe(true);
  });
});
