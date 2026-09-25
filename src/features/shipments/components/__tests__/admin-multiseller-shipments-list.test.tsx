import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createShipment,
  getEligibleShipmentOrders,
  getShipments,
  type EligibleShipmentOrder,
} from "@/features/shipments/api";

import { AdminShipmentsList } from "../admin-shipments-list";

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

vi.mock("@/features/shipments/api", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/shipments/api")
  >("@/features/shipments/api");

  return {
    ...actual,
    createShipment: vi.fn(),
    getEligibleShipmentOrders: vi.fn(),
    getShipments: vi.fn(),
  };
});

const mockedGetShipments = vi.mocked(getShipments);
const mockedEligible = vi.mocked(getEligibleShipmentOrders);
const mockedCreate = vi.mocked(createShipment);

const eligibleOrder: EligibleShipmentOrder = {
  id: 42,
  order_number: "ORDER-42",
  user: 1,
  user_email: "buyer@example.com",
  user_full_name: "Test Buyer",
  total_amount: "3000",
  shipping_cost: "200",
  receiver_name: "Test Buyer",
  receiver_phone: "09120000000",
  province: "Tehran",
  city: "Tehran",
  paid_at: "2026-09-25T08:00:00Z",
  created_at: "2026-09-25T07:00:00Z",
  requires_seller_selection: true,
  eligible_sellers: [
    {
      id: 11,
      name: "Seller A",
      status: "paid",
    },
    {
      id: 12,
      name: "Seller B",
      status: "paid",
    },
  ],
};

describe("AdminShipmentsList - multi-seller shipping", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetShipments.mockResolvedValue([]);
    mockedEligible.mockResolvedValue([eligibleOrder]);
  });

  it("requires seller selection and sends the selected seller", async () => {
    const user = userEvent.setup();

    mockedCreate.mockResolvedValue({
      id: 77,
      shipment_number: "SHP-77",
      seller: 12,
      seller_name: "Seller B",
    } as Awaited<ReturnType<typeof createShipment>>);

    render(<AdminShipmentsList />);

    const sellerSelect = await screen.findByRole("combobox", {
      name: /seller for ORDER-42/i,
    });

    const createButton = screen.getByRole("button", {
      name: /create post/i,
    });

    expect(createButton).toBeDisabled();

    await user.selectOptions(sellerSelect, "12");

    expect(createButton).toBeEnabled();

    await user.click(createButton);

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith({
        order: 42,
        seller: 12,
        carrier: "post",
      });
    });
  });

  it("automatically uses the only eligible seller", async () => {
    const user = userEvent.setup();

    mockedEligible.mockResolvedValue([
      {
        ...eligibleOrder,
        eligible_sellers: [
          {
            id: 11,
            name: "Seller A",
            status: "processing",
          },
        ],
      },
    ]);

    mockedCreate.mockResolvedValue({
      id: 78,
      shipment_number: "SHP-78",
    } as Awaited<ReturnType<typeof createShipment>>);

    render(<AdminShipmentsList />);

    expect(await screen.findByText("Seller: Seller A")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /create post/i,
      }),
    );

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith({
        order: 42,
        seller: 11,
        carrier: "post",
      });
    });
  });
});
