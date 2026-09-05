import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cancelOrder, getOrder } from "../../api";
import type { OrderDetail as OrderDetailType } from "../../types";
import { OrderDetail } from "../order-detail";

const paramsMock = vi.hoisted(() => ({
  id: "1",
}));

vi.mock("next/navigation", () => ({
  useParams: () => paramsMock,
}));

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
  getOrder: vi.fn(),
  cancelOrder: vi.fn(),
}));

const mockedGetOrder = vi.mocked(getOrder);
const mockedCancelOrder = vi.mocked(cancelOrder);

function makeOrder(overrides: Partial<OrderDetailType> = {}): OrderDetailType {
  return {
    id: 1,
    order_number: "MBA-1001",
    user: 1,
    status: "pending_payment",
    status_display: "Pending payment",
    payment_status: "unpaid",
    payment_status_display: "Unpaid",
    subtotal: "1200000",
    discount_amount: "100000",
    shipping_cost: "50000",
    tax_amount: "0",
    total_amount: "1150000",
    receiver_name: "Sina Moghtader Far",
    receiver_phone: "+4917612345678",
    province: "Bavaria",
    city: "Bamberg",
    address: "Main street 1",
    postal_code: "96047",
    customer_note: "Please call before delivery.",
    admin_note: "Packed carefully.",
    paid_at: null,
    cancelled_at: null,
    delivered_at: null,
    created_at: "2026-09-05T18:00:00Z",
    updated_at: "2026-09-05T18:00:00Z",
    items: [
      {
        id: 1,
        product: 10,
        product_id: 10,
        warehouse: 1,
        warehouse_name: "Main Warehouse",
        product_name: "Mechanical Keyboard",
        product_sku: "KB-001",
        quantity: 2,
        unit_price: "600000",
        total_price: "1200000",
        created_at: "2026-09-05T18:00:00Z",
      },
    ],
    status_history: [
      {
        id: 1,
        old_status: "",
        new_status: "pending_payment",
        changed_by: 1,
        changed_by_name: "Sina Moghtader Far",
        note: "Order created from cart.",
        created_at: "2026-09-05T18:00:00Z",
      },
    ],
    ...overrides,
  };
}

describe("OrderDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders order detail, progress, notes, summary, and status history", async () => {
    mockedGetOrder.mockResolvedValue(makeOrder());

    render(<OrderDetail />);

    expect(
      await screen.findByRole("heading", { name: "MBA-1001" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Pending payment").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Unpaid")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /mechanical keyboard/i }),
    ).toHaveAttribute("href", "/products/10");

    expect(screen.getByText("SKU: KB-001")).toBeInTheDocument();
    expect(screen.getByText("Quantity: 2")).toBeInTheDocument();
    expect(screen.getByText("Warehouse: Main Warehouse")).toBeInTheDocument();

    expect(
      screen.getByText("Please call before delivery."),
    ).toBeInTheDocument();
    expect(screen.getByText("Packed carefully.")).toBeInTheDocument();
    expect(screen.getByText("Created → pending_payment")).toBeInTheDocument();
    expect(screen.getByText("Order created from cart.")).toBeInTheDocument();

    expect(
      screen.getAllByText("Sina Moghtader Far").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("+4917612345678")).toBeInTheDocument();
    expect(screen.getByText(/Bavaria/i)).toBeInTheDocument();
    expect(screen.getByText(/Bamberg/i)).toBeInTheDocument();
  });

  it("cancels pending order after confirmation", async () => {
    const user = userEvent.setup();

    mockedGetOrder.mockResolvedValue(makeOrder());
    mockedCancelOrder.mockResolvedValue(
      makeOrder({
        status: "cancelled",
        status_display: "Cancelled",
        cancelled_at: "2026-09-05T19:00:00Z",
      }),
    );

    render(<OrderDetail />);

    await user.click(
      await screen.findByRole("button", { name: /cancel order/i }),
    );

    await waitFor(() => {
      expect(mockedCancelOrder).toHaveBeenCalledWith(1);
    });

    expect(
      await screen.findByText("Order cancelled successfully."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This order has been cancelled."),
    ).toBeInTheDocument();
  });

  it("does not cancel order when confirmation is cancelled", async () => {
    const user = userEvent.setup();

    vi.mocked(window.confirm).mockReturnValue(false);
    mockedGetOrder.mockResolvedValue(makeOrder());

    render(<OrderDetail />);

    await user.click(
      await screen.findByRole("button", { name: /cancel order/i }),
    );

    expect(mockedCancelOrder).not.toHaveBeenCalled();
  });

  it("shows cancel error without replacing the loaded order", async () => {
    const user = userEvent.setup();

    mockedGetOrder.mockResolvedValue(makeOrder());
    mockedCancelOrder.mockRejectedValue(
      new Error("Order cannot be cancelled."),
    );

    render(<OrderDetail />);

    await user.click(
      await screen.findByRole("button", { name: /cancel order/i }),
    );

    expect(
      await screen.findByText("Order cannot be cancelled."),
    ).toBeInTheDocument();
    expect(screen.getByText("MBA-1001")).toBeInTheDocument();
  });

  it("does not show cancel button for non-pending orders", async () => {
    mockedGetOrder.mockResolvedValue(
      makeOrder({
        status: "delivered",
        status_display: "Delivered",
        payment_status: "paid",
        payment_status_display: "Paid",
        delivered_at: "2026-09-06T18:00:00Z",
      }),
    );

    render(<OrderDetail />);

    expect(await screen.findByText("MBA-1001")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cancel order/i }),
    ).not.toBeInTheDocument();
  });

  it("shows load error", async () => {
    mockedGetOrder.mockRejectedValue(new Error("Order is not available."));

    render(<OrderDetail />);

    expect(
      await screen.findByText(/could not load order/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Order is not available.")).toBeInTheDocument();
  });
});
