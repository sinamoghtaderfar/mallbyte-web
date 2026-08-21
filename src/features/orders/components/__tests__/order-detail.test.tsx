import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderDetail } from "../order-detail";
import { cancelOrder, getOrder } from "../../api";
import type { OrderDetail as OrderDetailType } from "../../types";

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
    order_number: "ORD-20260821-ABC",
    user: 1,
    status: "pending_payment",
    status_display: "Pending payment",
    payment_status: "unpaid",
    payment_status_display: "Unpaid",
    subtotal: "2100000.00",
    discount_amount: "0.00",
    shipping_cost: "0.00",
    tax_amount: "0.00",
    total_amount: "2100000.00",
    receiver_name: "Sina Moghtaderfar",
    receiver_phone: "+989222222222",
    province: "Bayern",
    city: "Bamberg",
    address: "Pestalozzistraße 9A",
    postal_code: "96052",
    customer_note: "",
    admin_note: "",
    paid_at: null,
    cancelled_at: null,
    delivered_at: null,
    created_at: "2026-08-21T00:00:00Z",
    updated_at: "2026-08-21T00:00:00Z",
    items: [
      {
        id: 10,
        product: 12,
        product_id: 12,
        warehouse: 1,
        warehouse_name: "Main",
        product_name: "Keyboard",
        product_sku: "KB-001",
        quantity: 1,
        unit_price: "2100000.00",
        total_price: "2100000.00",
        created_at: "2026-08-21T00:00:00Z",
      },
    ],
    status_history: [],
    ...overrides,
  };
}

describe("OrderDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders order detail and summary", async () => {
    mockedGetOrder.mockResolvedValue(makeOrder());

    render(<OrderDetail />);

    expect(await screen.findByText("ORD-20260821-ABC")).toBeInTheDocument();
    expect(screen.getByText("Pending payment")).toBeInTheDocument();
    expect(screen.getByText("Keyboard")).toBeInTheDocument();
    expect(screen.getByText("SKU: KB-001")).toBeInTheDocument();
    expect(screen.getByText("Quantity: 1")).toBeInTheDocument();
    expect(screen.getByText("Sina Moghtaderfar")).toBeInTheDocument();
    expect(screen.getByText("+989222222222")).toBeInTheDocument();
  });

  it("shows cancel button only for pending payment orders", async () => {
    mockedGetOrder.mockResolvedValue(makeOrder());

    render(<OrderDetail />);

    expect(
      await screen.findByRole("button", { name: /cancel order/i }),
    ).toBeInTheDocument();
  });

  it("does not show cancel button for cancelled orders", async () => {
    mockedGetOrder.mockResolvedValue(
      makeOrder({
        status: "cancelled",
        status_display: "Cancelled",
      }),
    );

    render(<OrderDetail />);

    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cancel order/i }),
    ).not.toBeInTheDocument();
  });

  it("cancels pending order and updates order state", async () => {
    const user = userEvent.setup();

    mockedGetOrder.mockResolvedValue(makeOrder());
    mockedCancelOrder.mockResolvedValue(
      makeOrder({
        status: "cancelled",
        status_display: "Cancelled",
      }),
    );

    render(<OrderDetail />);

    const cancelButton = await screen.findByRole("button", {
      name: /cancel order/i,
    });

    await user.click(cancelButton);

    await waitFor(() => {
      expect(mockedCancelOrder).toHaveBeenCalledWith(1);
    });

    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
  });

  it("shows load error", async () => {
    mockedGetOrder.mockRejectedValue(new Error("Order not available."));

    render(<OrderDetail />);

    expect(
      await screen.findByText(/could not load order/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Order not available.")).toBeInTheDocument();
  });
});
