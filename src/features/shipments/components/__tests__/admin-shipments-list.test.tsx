import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createShipment,
  getEligibleShipmentOrders,
  getShipments,
  type EligibleShipmentOrder,
  type ShipmentDetail,
  type ShipmentListItem,
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
    getShipments: vi.fn(),
    getEligibleShipmentOrders: vi.fn(),
    createShipment: vi.fn(),
  };
});

const mockedGetShipments = vi.mocked(getShipments);
const mockedGetEligibleShipmentOrders = vi.mocked(getEligibleShipmentOrders);
const mockedCreateShipment = vi.mocked(createShipment);

function makeShipment(
  overrides: Partial<ShipmentListItem> = {},
): ShipmentListItem {
  return {
    id: 1,
    shipment_number: "SHP-20260917-AAA111",
    order: 5,
    order_number: "ORD-20260915-ORDER1",
    user: 1,
    user_email: "sina@example.com",
    carrier: "tipax",
    carrier_display: "Tipax",
    status: "pending",
    status_display: "Pending",
    tracking_number: "",
    shipping_cost: "0",
    created_at: "2026-09-17T19:00:00Z",
    shipped_at: null,
    delivered_at: null,
    ...overrides,
  };
}

function makeEligibleOrder(
  overrides: Partial<EligibleShipmentOrder> = {},
): EligibleShipmentOrder {
  return {
    id: 7,
    order_number: "ORD-20260916-ELIGIBLE",
    user: 1,
    user_email: "customer@example.com",
    user_full_name: "Test Customer",
    total_amount: "890000",
    shipping_cost: "0",
    receiver_name: "Test Customer",
    receiver_phone: "+4917612345678",
    province: "Bavaria",
    city: "Bamberg",
    paid_at: "2026-09-16T18:00:00Z",
    created_at: "2026-09-16T17:00:00Z",
    ...overrides,
  };
}

function makeShipmentDetail(
  overrides: Partial<ShipmentDetail> = {},
): ShipmentDetail {
  return {
    ...makeShipment(),
    user_full_name: "Test Customer",
    tracking_url: "",
    receiver_name: "Test Customer",
    receiver_phone: "+4917612345678",
    province: "Bavaria",
    city: "Bamberg",
    address: "Main street 1",
    postal_code: "96047",
    notes: "",
    cancelled_at: null,
    created_by: 1,
    updated_at: "2026-09-17T19:00:00Z",
    events: [],
    ...overrides,
  };
}

describe("AdminShipmentsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetShipments.mockResolvedValue([]);
    mockedGetEligibleShipmentOrders.mockResolvedValue([]);
  });

  it("renders shipment summaries, eligible orders, and existing shipments", async () => {
    mockedGetShipments.mockResolvedValue([
      makeShipment(),
      makeShipment({
        id: 2,
        shipment_number: "SHP-20260917-BBB222",
        status: "shipped",
        status_display: "Shipped",
        carrier: "dhl",
        carrier_display: "DHL",
      }),
      makeShipment({
        id: 3,
        shipment_number: "SHP-20260917-CCC333",
        status: "delivered",
        status_display: "Delivered",
      }),
    ]);
    mockedGetEligibleShipmentOrders.mockResolvedValue([makeEligibleOrder()]);

    render(<AdminShipmentsList />);

    expect(
      await screen.findByRole("heading", { name: /shipping management/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("ORD-20260916-ELIGIBLE")).toBeInTheDocument();
    expect(screen.getByText("SHP-20260917-AAA111")).toBeInTheDocument();
    expect(screen.getByText("SHP-20260917-BBB222")).toBeInTheDocument();
    expect(screen.getByText("SHP-20260917-CCC333")).toBeInTheDocument();

    expect(screen.getByText("Total shipments").parentElement).toHaveTextContent(
      "3",
    );
    expect(screen.getAllByText("Pending")[0].parentElement).toHaveTextContent(
      "1",
    );
    expect(screen.getByText("In transit").parentElement).toHaveTextContent("1");
    expect(screen.getAllByText("Delivered")[0].parentElement).toHaveTextContent(
      "1",
    );

    expect(screen.getAllByRole("link", { name: "Manage" })[0]).toHaveAttribute(
      "href",
      "/admin/shipments/1",
    );
  });

  it("creates a shipment for an eligible order with the selected carrier and refetches data", async () => {
    const user = userEvent.setup();
    const eligibleOrder = makeEligibleOrder();
    const createdShipment = makeShipmentDetail({
      id: 10,
      shipment_number: "SHP-20260917-NEW999",
      order: eligibleOrder.id,
      order_number: eligibleOrder.order_number,
      carrier: "dhl",
      carrier_display: "DHL",
    });

    mockedGetShipments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createdShipment]);
    mockedGetEligibleShipmentOrders
      .mockResolvedValueOnce([eligibleOrder])
      .mockResolvedValueOnce([]);
    mockedCreateShipment.mockResolvedValue(createdShipment);

    render(<AdminShipmentsList />);

    expect(
      await screen.findByText(eligibleOrder.order_number),
    ).toBeInTheDocument();

    const [carrierSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(carrierSelect, "dhl");

    await user.click(screen.getByRole("button", { name: "Create DHL" }));

    await waitFor(() => {
      expect(mockedCreateShipment).toHaveBeenCalledWith({
        order: eligibleOrder.id,
        carrier: "dhl",
      });
    });

    expect(
      await screen.findByText(
        `Shipment ${createdShipment.shipment_number} created for order ${eligibleOrder.order_number}.`,
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("No eligible paid orders."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(createdShipment.shipment_number),
    ).toBeInTheDocument();
    expect(mockedGetShipments).toHaveBeenCalledTimes(2);
    expect(mockedGetEligibleShipmentOrders).toHaveBeenCalledTimes(2);
  });

  it("filters the shipment list by status", async () => {
    const user = userEvent.setup();

    mockedGetShipments.mockResolvedValue([
      makeShipment({
        id: 1,
        shipment_number: "SHP-PENDING",
        status: "pending",
        status_display: "Pending",
      }),
      makeShipment({
        id: 2,
        shipment_number: "SHP-DELIVERED",
        status: "delivered",
        status_display: "Delivered",
      }),
    ]);

    render(<AdminShipmentsList />);

    expect(await screen.findByText("SHP-PENDING")).toBeInTheDocument();
    expect(screen.getByText("SHP-DELIVERED")).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    const statusSelect = selects[1];

    await user.selectOptions(statusSelect, "delivered");

    expect(screen.queryByText("SHP-PENDING")).not.toBeInTheDocument();
    expect(screen.getByText("SHP-DELIVERED")).toBeInTheDocument();
  });

  it("shows empty states when there are no eligible orders or shipments", async () => {
    render(<AdminShipmentsList />);

    expect(
      await screen.findByText("No eligible paid orders."),
    ).toBeInTheDocument();
    expect(screen.getByText("No shipments found.")).toBeInTheDocument();
  });

  it("shows a load error", async () => {
    mockedGetShipments.mockRejectedValue(new Error("Shipping is unavailable."));

    render(<AdminShipmentsList />);

    expect(
      await screen.findByText("Shipping is unavailable."),
    ).toBeInTheDocument();
  });

  it("shows a create error and keeps the eligible order visible", async () => {
    const user = userEvent.setup();
    const eligibleOrder = makeEligibleOrder();

    mockedGetEligibleShipmentOrders.mockResolvedValue([eligibleOrder]);
    mockedCreateShipment.mockRejectedValue(
      new Error("Shipment could not be created."),
    );

    render(<AdminShipmentsList />);

    expect(
      await screen.findByText(eligibleOrder.order_number),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Post" }));

    expect(
      await screen.findByText("Shipment could not be created."),
    ).toBeInTheDocument();
    expect(screen.getByText(eligibleOrder.order_number)).toBeInTheDocument();
    expect(mockedGetShipments).toHaveBeenCalledTimes(1);
  });
});
