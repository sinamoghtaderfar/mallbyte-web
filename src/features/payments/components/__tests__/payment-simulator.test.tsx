import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrder } from "@/features/orders/api";
import type { OrderDetail } from "@/features/orders/types";

import {
  cancelPaymentAttempt,
  createPayment,
  markPaymentFailed,
  markPaymentSuccess,
} from "../../api";
import type { PaymentDetail } from "../../types";
import { PaymentSimulator } from "../payment-simulator";

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

vi.mock("@/features/orders/api", () => ({
  getOrder: vi.fn(),
}));

vi.mock("../../api", () => ({
  createPayment: vi.fn(),
  markPaymentSuccess: vi.fn(),
  markPaymentFailed: vi.fn(),
  cancelPaymentAttempt: vi.fn(),
}));

const mockedGetOrder = vi.mocked(getOrder);
const mockedCreatePayment = vi.mocked(createPayment);
const mockedMarkPaymentSuccess = vi.mocked(markPaymentSuccess);
const mockedMarkPaymentFailed = vi.mocked(markPaymentFailed);
const mockedCancelPaymentAttempt = vi.mocked(cancelPaymentAttempt);

function makeOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
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
    customer_note: "",
    admin_note: "",
    paid_at: null,
    cancelled_at: null,
    delivered_at: null,
    created_at: "2026-09-05T18:00:00Z",
    updated_at: "2026-09-05T18:00:00Z",
    items: [],
    status_history: [],
    ...overrides,
  };
}

function makePayment(overrides: Partial<PaymentDetail> = {}): PaymentDetail {
  return {
    id: 10,
    payment_number: "PAY-1001",
    order: 1,
    order_number: "MBA-1001",
    user: 1,
    user_email: "sina@example.com",
    user_full_name: "Sina Moghtader Far",
    provider: "mock",
    provider_display: "Mock",
    status: "pending",
    status_display: "Pending",
    amount: "1150000",
    currency: "IRR",
    gateway_reference: "",
    gateway_response: {},
    failure_reason: "",
    paid_at: null,
    failed_at: null,
    cancelled_at: null,
    refunded_at: null,
    created_by: 1,
    created_at: "2026-09-05T18:00:00Z",
    updated_at: "2026-09-05T18:00:00Z",
    events: [
      {
        id: 1,
        event_type: "payment_created",
        old_status: "",
        new_status: "pending",
        message: "Payment attempt created.",
        data: {},
        created_by: 1,
        created_by_name: "Sina Moghtader Far",
        created_at: "2026-09-05T18:00:00Z",
      },
    ],
    ...overrides,
  };
}

describe("PaymentSimulator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads an unpaid order and shows payment summary", async () => {
    mockedGetOrder.mockResolvedValue(makeOrder());

    render(<PaymentSimulator />);

    expect(
      await screen.findByRole("heading", { name: /pay order mba-1001/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pending payment")).toBeInTheDocument();
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
    expect(screen.getByText("1,150,000 IRR")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create mock payment/i }),
    ).toBeInTheDocument();
  });

  it("creates a mock payment attempt", async () => {
    const user = userEvent.setup();

    mockedGetOrder.mockResolvedValue(makeOrder());
    mockedCreatePayment.mockResolvedValue(makePayment());

    render(<PaymentSimulator />);

    await user.click(
      await screen.findByRole("button", { name: /create mock payment/i }),
    );

    await waitFor(() => {
      expect(mockedCreatePayment).toHaveBeenCalledWith({
        order: 1,
        provider: "mock",
      });
    });

    await waitFor(() => {
      expect(
        screen.getAllByText("Payment attempt created.").length,
      ).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText("PAY-1001").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: /mark as paid/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /mark as failed/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel payment/i }),
    ).toBeInTheDocument();
  });

  it("marks payment as successful and refreshes the order", async () => {
    const user = userEvent.setup();

    mockedGetOrder.mockResolvedValueOnce(makeOrder()).mockResolvedValueOnce(
      makeOrder({
        status: "paid",
        status_display: "Paid",
        payment_status: "paid",
        payment_status_display: "Paid",
        paid_at: "2026-09-05T19:00:00Z",
      }),
    );

    mockedCreatePayment.mockResolvedValue(makePayment());
    mockedMarkPaymentSuccess.mockResolvedValue(
      makePayment({
        status: "success",
        status_display: "Success",
        gateway_reference: "MOCK-123",
        paid_at: "2026-09-05T19:00:00Z",
      }),
    );

    render(<PaymentSimulator />);

    await user.click(
      await screen.findByRole("button", { name: /create mock payment/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /mark as paid/i }),
    );

    await waitFor(() => {
      expect(mockedMarkPaymentSuccess).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          gateway_reference: expect.stringMatching(/^MOCK-/),
          gateway_response: expect.objectContaining({
            status: "ok",
            source: "frontend-demo",
          }),
        }),
      );
    });

    expect(
      await screen.findByText("Payment completed successfully."),
    ).toBeInTheDocument();
    expect(screen.getByText("This order is already paid")).toBeInTheDocument();
  });

  it("marks payment as failed", async () => {
    const user = userEvent.setup();

    mockedGetOrder.mockResolvedValue(makeOrder());
    mockedCreatePayment.mockResolvedValue(makePayment());
    mockedMarkPaymentFailed.mockResolvedValue(
      makePayment({
        status: "failed",
        status_display: "Failed",
        failure_reason: "Gateway declined payment.",
      }),
    );

    render(<PaymentSimulator />);

    await user.click(
      await screen.findByRole("button", { name: /create mock payment/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /mark as failed/i }),
    );

    await waitFor(() => {
      expect(mockedMarkPaymentFailed).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          reason: "Mock payment failed from frontend demo.",
        }),
      );
    });

    expect(
      await screen.findByText("Payment marked as failed."),
    ).toBeInTheDocument();
    expect(screen.getByText(/gateway declined payment/i)).toBeInTheDocument();
  });

  it("cancels a payment attempt", async () => {
    const user = userEvent.setup();

    mockedGetOrder.mockResolvedValue(makeOrder());
    mockedCreatePayment.mockResolvedValue(makePayment());
    mockedCancelPaymentAttempt.mockResolvedValue(
      makePayment({
        status: "cancelled",
        status_display: "Cancelled",
        cancelled_at: "2026-09-05T19:00:00Z",
      }),
    );

    render(<PaymentSimulator />);

    await user.click(
      await screen.findByRole("button", { name: /create mock payment/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /cancel payment/i }),
    );

    await waitFor(() => {
      expect(mockedCancelPaymentAttempt).toHaveBeenCalledWith(10, {
        reason: "Customer cancelled the mock payment.",
      });
    });

    expect(
      await screen.findByText("Payment attempt cancelled."),
    ).toBeInTheDocument();
  });

  it("does not allow payment for already paid orders", async () => {
    mockedGetOrder.mockResolvedValue(
      makeOrder({
        status: "paid",
        status_display: "Paid",
        payment_status: "paid",
        payment_status_display: "Paid",
      }),
    );

    render(<PaymentSimulator />);

    expect(
      await screen.findByText("This order is already paid"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create mock payment/i }),
    ).not.toBeInTheDocument();
  });

  it("shows load error", async () => {
    mockedGetOrder.mockRejectedValue(new Error("Order is not available."));

    render(<PaymentSimulator />);

    expect(
      await screen.findByText(/could not load payment page/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Order is not available.")).toBeInTheDocument();
  });
});
