import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrderShipment, type ShipmentDetail } from "../../api";
import { OrderShipmentTracking } from "../order-shipment-tracking";

vi.mock("../../api", async () => {
  const actual = await vi.importActual<typeof import("../../api")>("../../api");

  return {
    ...actual,
    getOrderShipment: vi.fn(),
  };
});

const mockedGetOrderShipment = vi.mocked(getOrderShipment);

function makeShipment(overrides: Partial<ShipmentDetail> = {}): ShipmentDetail {
  return {
    id: 2,
    shipment_number: "SHP-20260917-44F730",
    order: 9,
    order_number: "ORD-20260916-7F55D1",
    user: 1,
    user_email: "sina@example.com",
    user_full_name: "Sina Moghtader Far",
    carrier: "post",
    carrier_display: "Post",
    status: "shipped",
    status_display: "Shipped",
    tracking_number: "TPX-123456",
    tracking_url: "https://tracking.example.com/TPX-123456",
    shipping_cost: "0",
    receiver_name: "Sina",
    receiver_phone: "+4917612345678",
    province: "Bavaria",
    city: "Bamberg",
    address: "Main street 1",
    postal_code: "96047",
    notes: "",
    shipped_at: "2026-09-17T19:26:46Z",
    delivered_at: null,
    cancelled_at: null,
    created_by: 1,
    created_at: "2026-09-17T19:26:04Z",
    updated_at: "2026-09-17T19:26:46Z",
    events: [
      {
        id: 2,
        old_status: "pending",
        new_status: "shipped",
        message: "Package prepared",
        data: {},
        created_by: 1,
        created_by_name: "Admin User",
        created_at: "2026-09-17T19:26:46Z",
      },
      {
        id: 1,
        old_status: "",
        new_status: "pending",
        message: "Shipment created from paid order.",
        data: {},
        created_by: 1,
        created_by_name: "Admin User",
        created_at: "2026-09-17T19:26:04Z",
      },
    ],
    ...overrides,
  };
}

describe("OrderShipmentTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders shipment status, carrier, tracking link, dates, and events", async () => {
    mockedGetOrderShipment.mockResolvedValue(makeShipment());

    render(<OrderShipmentTracking orderId={9} />);

    expect(await screen.findByText("SHP-20260917-44F730")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /shipment tracking/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("SHP-20260917-44F730")).toBeInTheDocument();
    expect(screen.getByText("Shipped")).toBeInTheDocument();
    expect(screen.getByText("Post")).toBeInTheDocument();
    expect(screen.getByText("TPX-123456")).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: /track shipment/i,
      }),
    ).toHaveAttribute("href", "https://tracking.example.com/TPX-123456");

    expect(screen.getByText("Pending → Shipped")).toBeInTheDocument();
    expect(screen.getByText("Package prepared")).toBeInTheDocument();

    expect(
      screen.getByText("Shipment created from paid order."),
    ).toBeInTheDocument();

    expect(mockedGetOrderShipment).toHaveBeenCalledWith(9);
  });

  it("shows an empty state when the order has no shipment", async () => {
    mockedGetOrderShipment.mockResolvedValue(null);

    render(<OrderShipmentTracking orderId={9} />);

    expect(
      await screen.findByText(/no shipment has been created yet/i),
    ).toBeInTheDocument();
  });

  it("shows delivered shipment information", async () => {
    mockedGetOrderShipment.mockResolvedValue(
      makeShipment({
        status: "delivered",
        status_display: "Delivered",
        delivered_at: "2026-09-17T19:27:19Z",
        events: [
          {
            id: 3,
            old_status: "shipped",
            new_status: "delivered",
            message: "Shipment delivered.",
            data: {},
            created_by: 1,
            created_by_name: "Admin User",
            created_at: "2026-09-17T19:27:19Z",
          },
        ],
      }),
    );

    render(<OrderShipmentTracking orderId={9} />);

    expect(await screen.findByText("Delivered")).toBeInTheDocument();

    expect(screen.getByText("Shipped → Delivered")).toBeInTheDocument();

    expect(screen.getByText("Shipment delivered.")).toBeInTheDocument();
  });

  it("shows a load error", async () => {
    mockedGetOrderShipment.mockRejectedValue(
      new Error("Shipment information is not available."),
    );

    render(<OrderShipmentTracking orderId={9} />);

    expect(
      await screen.findByText(/could not load shipment information/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Shipment information is not available."),
    ).toBeInTheDocument();
  });
});
