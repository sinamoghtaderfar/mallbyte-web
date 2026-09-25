import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getSellerOrder,
  getSellerOrders,
  updateSellerOrderStatus,
} from "../../api";

import type { SellerOrderDetail, SellerOrderListItem } from "../../types";

import { SellerOrderDetail as SellerOrderDetailPage } from "../seller-order-detail";
import { SellerOrdersList } from "../seller-orders-list";

const params = vi.hoisted(() => ({
  id: "42",
}));

vi.mock("next/navigation", () => ({
  useParams: () => params,
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
  getSellerOrder: vi.fn(),
  getSellerOrders: vi.fn(),
  updateSellerOrderStatus: vi.fn(),
}));

const mockedGetOrder = vi.mocked(getSellerOrder);
const mockedGetOrders = vi.mocked(getSellerOrders);
const mockedUpdateStatus = vi.mocked(updateSellerOrderStatus);

function makeOrder(
  overrides: Partial<SellerOrderDetail> = {},
): SellerOrderDetail {
  return {
    id: 42,
    order_number: "MBA-0042",

    status: "paid",
    status_display: "Paid",

    seller_status: "paid",
    seller_status_display: "Paid",

    payment_status: "paid",
    payment_status_display: "Paid",

    seller_items_count: 1,
    seller_total_amount: "1000000",

    receiver_name: "Test customer",
    receiver_phone: "+49123456789",

    province: "Bavaria",
    city: "Bamberg",
    address: "Example street 1",
    postal_code: "96047",

    customer_note: "",

    created_at: "2026-09-24T10:00:00Z",
    updated_at: "2026-09-24T10:00:00Z",
    paid_at: "2026-09-24T10:05:00Z",
    cancelled_at: null,
    delivered_at: null,

    items: [
      {
        id: 100,
        product: 11,
        product_name: "Seller A product",
        product_sku: "SELLER-A-001",
        quantity: 1,
        unit_price: "1000000",
        total_price: "1000000",
        created_at: "2026-09-24T10:00:00Z",
      },
    ],

    status_history: [],

    ...overrides,
  };
}

describe("Seller Orders - isolated fulfillment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows seller-specific status in the orders list", async () => {
    const order: SellerOrderListItem = makeOrder({
      status: "paid",
      status_display: "Paid",
      seller_status: "processing",
      seller_status_display: "Processing",
    });

    mockedGetOrders.mockResolvedValue([order]);

    render(<SellerOrdersList />);

    expect(await screen.findByText("MBA-0042")).toBeInTheDocument();

    expect(screen.getByText("Processing")).toBeInTheDocument();

    expect(screen.getByText("1 item(s)")).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: /view details/i,
      }),
    ).toHaveAttribute("href", "/seller/orders/42");
  });

  it("chooses the next action from seller_status", async () => {
    mockedGetOrder.mockResolvedValue(
      makeOrder({
        status: "processing",
        status_display: "Processing",

        seller_status: "paid",
        seller_status_display: "Paid",
      }),
    );

    render(<SellerOrderDetailPage />);

    expect(
      await screen.findByRole("button", {
        name: "Mark as processing",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/overall order: processing/i)).toBeInTheDocument();

    expect(screen.getByText(/your fulfillment: paid/i)).toBeInTheDocument();
  });

  it("allows processing but prevents direct shipping and delivery", async () => {
    const user = userEvent.setup();

    mockedGetOrder.mockResolvedValue(makeOrder());

    mockedUpdateStatus.mockResolvedValue(
      makeOrder({
        seller_status: "processing",
        seller_status_display: "Processing",
      }),
    );

    render(<SellerOrderDetailPage />);

    await user.click(
      await screen.findByRole("button", {
        name: "Mark as processing",
      }),
    );

    await waitFor(() => {
      expect(mockedUpdateStatus).toHaveBeenCalledWith("42", {
        status: "processing",
        note: expect.any(String),
      });
    });

    expect(
      await screen.findByText(/shipping team will update/i),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /mark as shipped/i,
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /mark as delivered/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("does not show shipping actions for a processing seller", async () => {
    mockedGetOrder.mockResolvedValue(
      makeOrder({
        seller_status: "processing",
        seller_status_display: "Processing",
      }),
    );

    render(<SellerOrderDetailPage />);

    expect(await screen.findByText("MBA-0042")).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /mark as shipped/i,
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /mark as delivered/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("does not allow fulfillment actions for unpaid orders", async () => {
    mockedGetOrder.mockResolvedValue(
      makeOrder({
        payment_status: "unpaid",
        payment_status_display: "Unpaid",
      }),
    );

    render(<SellerOrderDetailPage />);

    expect(await screen.findByText("MBA-0042")).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /mark as/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("does not allow fulfillment actions for cancelled orders", async () => {
    mockedGetOrder.mockResolvedValue(
      makeOrder({
        status: "cancelled",
        status_display: "Cancelled",
      }),
    );

    render(<SellerOrderDetailPage />);

    expect(await screen.findByText("MBA-0042")).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /mark as/i,
      }),
    ).not.toBeInTheDocument();
  });
});
