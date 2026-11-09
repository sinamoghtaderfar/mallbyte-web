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

vi.mock("@/features/returns/components/order-return-badge", () => ({
  OrderReturnBadge: () => null,
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
    expect(
      screen.getByText(
        "2 of 2 orders on this page · 2 orders in your history.",
      ),
    ).toBeInTheDocument();
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
    expect(
      screen.getByText(
        "1 of 2 orders on this page · 2 orders in your history.",
      ),
    ).toBeInTheDocument();
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

    await user.selectOptions(
      screen.getByLabelText(/sort this page/i),
      "total_high",
    );

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
      await screen.findByText(/no orders on this page match your filters/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /try changing the filters, clearing them, or browsing another page/i,
      ),
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

  it("navigates a 21-order history using bounded server pages and authoritative counts", async () => {
    const user = userEvent.setup();
    const records = Array.from({ length: 21 }, (_, index) =>
      makeOrder({
        id: index + 1,
        order_number: `MBA-PAGE-${index + 1}`,
        total_amount: "100",
      }),
    );
    mockedGetOrders.mockImplementation(async (page = 1) => ({
      count: records.length,
      next:
        page === 1
          ? "https://api.example.test/api/orders/orders/?page=2"
          : null,
      previous:
        page === 2
          ? "https://api.example.test/api/orders/orders/?page=1"
          : null,
      results: records.slice((page - 1) * 20, page * 20),
    }));
    render(<OrdersList />);
    await screen.findByText("MBA-PAGE-20");
    expect(screen.queryByText("MBA-PAGE-21")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "20 of 20 orders on this page · 21 orders in your history.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Orders (all pages)")).toBeInTheDocument();
    expect(screen.getByText("Pending (this page)")).toBeInTheDocument();
    expect(screen.getByText("Total amount (this page)")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("MBA-PAGE-21");
    expect(screen.queryByText("MBA-PAGE-20")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "1 of 1 orders on this page · 21 orders in your history.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next" }),
    ).toBeDisabled();
    expect(mockedGetOrders.mock.calls.map(([page]) => page)).toEqual([1, 2]);
    await user.click(
      screen.getByRole("button", { name: "Previous" }),
    );
    await screen.findByText("MBA-PAGE-20");
    expect(mockedGetOrders).toHaveBeenLastCalledWith(1);
  });

  it("keeps page-local filtering explicit and navigation available with no matches", async () => {
    const user = userEvent.setup();
    mockedGetOrders.mockImplementation(async (page = 1) => ({
      count: 21,
      next: page === 1 ? "?page=2" : null,
      previous: page === 2 ? "?page=1" : null,
      results: [
        makeOrder({
          id: page,
          order_number: page === 1 ? "MBA-FIRST" : "MBA-TARGET",
        }),
      ],
    }));
    render(<OrdersList />);
    await screen.findByText("MBA-FIRST");
    await user.type(screen.getByLabelText(/search orders/i), "TARGET");
    expect(
      screen.getByText(
        "0 of 1 orders on this page · 21 orders in your history.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/filters do not search other pages/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("MBA-TARGET");
    expect(
      screen.getByText(
        "1 of 1 orders on this page · 21 orders in your history.",
      ),
    ).toBeInTheDocument();
    expect(mockedGetOrders.mock.calls).toEqual([[1], [2]]);
  });

  it("allows retrying a failed later page without losing page navigation", async () => {
    const user = userEvent.setup();
    mockedGetOrders
      .mockResolvedValueOnce({
        ...makeResponse([makeOrder()]),
        count: 21,
        next: "?page=2",
      })
      .mockRejectedValueOnce(new Error("Second page unavailable"))
      .mockResolvedValueOnce({
        ...makeResponse([makeOrder({ id: 21, order_number: "MBA-21" })]),
        count: 21,
        previous: "?page=1",
      });
    render(<OrdersList />);
    await screen.findByText("MBA-1001");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Second page unavailable");
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Retry" }),
    );
    await screen.findByText("MBA-21");
    await waitFor(() =>
      expect(mockedGetOrders.mock.calls).toEqual([[1], [2], [2]]),
    );
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
