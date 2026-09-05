import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrders } from "../../api";
import type { OrderListItem } from "../../types";
import { OrdersList } from "../orders-list";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("../../api", () => ({
  getOrders: vi.fn(),
}));

const mockedGetOrders = vi.mocked(getOrders);

function makeOrder(overrides: Partial<OrderListItem> = {}): OrderListItem {
  return {
    id: 1,
    order_number: "MBA-1001",
    status: "pending_payment",
    status_display: "Pending payment",
    payment_status: "unpaid",
    payment_status_display: "Unpaid",
    items_count: 2,
    total_amount: "1200000",
    created_at: "2026-09-05T18:00:00Z",
    ...overrides,
  };
}

function makeResponse(orders: OrderListItem[]) {
  return {
    count: orders.length,
    next: null,
    previous: null,
    results: orders,
  };
}

describe("OrdersList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders order summary and order rows", async () => {
    mockedGetOrders.mockResolvedValue(
      makeResponse([
        makeOrder(),
        makeOrder({
          id: 2,
          order_number: "MBA-1002",
          status: "delivered",
          status_display: "Delivered",
          payment_status: "paid",
          payment_status_display: "Paid",
          items_count: 1,
          total_amount: "800000",
        }),
      ]),
    );

    render(<OrdersList />);

    expect(await screen.findByText("MBA-1001")).toBeInTheDocument();
    expect(screen.getByText("MBA-1002")).toBeInTheDocument();
    expect(screen.getByText("2 of 2 orders shown.")).toBeInTheDocument();
    expect(screen.getByText("2,000,000")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /MBA-1001/i })).toHaveAttribute(
      "href",
      "/orders/1",
    );
  });

  it("filters orders by search, status, and payment status", async () => {
    const user = userEvent.setup();

    mockedGetOrders.mockResolvedValue(
      makeResponse([
        makeOrder(),
        makeOrder({
          id: 2,
          order_number: "MBA-1002",
          status: "delivered",
          status_display: "Delivered",
          payment_status: "paid",
          payment_status_display: "Paid",
          total_amount: "800000",
        }),
      ]),
    );

    render(<OrdersList />);

    await screen.findByText("MBA-1001");

    await user.type(screen.getByLabelText(/search orders/i), "1002");
    await user.selectOptions(
      screen.getByLabelText(/order status/i),
      "delivered",
    );
    await user.selectOptions(screen.getByLabelText(/payment status/i), "paid");

    expect(screen.queryByText("MBA-1001")).not.toBeInTheDocument();
    expect(screen.getByText("MBA-1002")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 orders shown.")).toBeInTheDocument();
    expect(screen.getByText("Filters active")).toBeInTheDocument();
  });

  it("sorts orders by total amount", async () => {
    const user = userEvent.setup();

    mockedGetOrders.mockResolvedValue(
      makeResponse([
        makeOrder({
          id: 1,
          order_number: "MBA-LOW",
          total_amount: "1000",
        }),
        makeOrder({
          id: 2,
          order_number: "MBA-HIGH",
          total_amount: "9000",
        }),
      ]),
    );

    render(<OrdersList />);

    await screen.findByText("MBA-LOW");

    await user.selectOptions(screen.getByLabelText(/sort by/i), "total_high");

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("MBA-HIGH");
  });

  it("clears filters", async () => {
    const user = userEvent.setup();

    mockedGetOrders.mockResolvedValue(
      makeResponse([
        makeOrder(),
        makeOrder({
          id: 2,
          order_number: "MBA-1002",
          status: "delivered",
          status_display: "Delivered",
          payment_status: "paid",
          payment_status_display: "Paid",
        }),
      ]),
    );

    render(<OrdersList />);

    await screen.findByText("MBA-1001");

    await user.type(screen.getByLabelText(/search orders/i), "1002");
    expect(screen.queryByText("MBA-1001")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(screen.getByText("MBA-1001")).toBeInTheDocument();
    expect(screen.getByText("MBA-1002")).toBeInTheDocument();
  });

  it("shows empty filtered state", async () => {
    const user = userEvent.setup();

    mockedGetOrders.mockResolvedValue(makeResponse([makeOrder()]));

    render(<OrdersList />);

    await screen.findByText("MBA-1001");

    await user.type(screen.getByLabelText(/search orders/i), "missing");

    expect(
      await screen.findByText(/no orders match your filters/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/try changing the search term or clearing the filters/i),
    ).toBeInTheDocument();
  });

  it("shows no orders state", async () => {
    mockedGetOrders.mockResolvedValue(makeResponse([]));

    render(<OrdersList />);

    expect(await screen.findByText(/no orders yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse products/i }),
    ).toHaveAttribute("href", "/products");
  });

  it("shows load error", async () => {
    mockedGetOrders.mockRejectedValue(new Error("Orders are not available."));

    render(<OrdersList />);

    expect(
      await screen.findByText(/could not load orders/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Orders are not available.")).toBeInTheDocument();
  });
});
