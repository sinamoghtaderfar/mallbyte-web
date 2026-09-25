import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrderShipments, type ShipmentDetail } from "../../api";

import { OrderShipmentTracking } from "../order-shipment-tracking";

vi.mock("../../api", async () => {
  const actual = await vi.importActual<typeof import("../../api")>("../../api");

  return {
    ...actual,
    getOrderShipments: vi.fn(),
  };
});

const mockedGetOrderShipments = vi.mocked(getOrderShipments);

function makeShipment(overrides: Partial<ShipmentDetail> = {}): ShipmentDetail {
  return {
    id: 2,
    shipment_number: "SHP-20260917-44F730",
    order: 9,
    order_number: "ORD-20260916-7F55D1",
    user: 1,
    user_email: "buyer@example.com",
    user_full_name: "Test Buyer",
    seller_fulfillment: 101,
    seller: 11,
    seller_name: "Seller A",
    seller_status: "shipped",
    carrier: "post",
    carrier_display: "Post",
    status: "shipped",
    status_display: "Shipped",
    tracking_number: "TPX-123456",
    tracking_url: "https://tracking.example.com/TPX-123456",
    shipping_cost: "0",
    receiver_name: "Buyer",
    receiver_phone: "09120000000",
    province: "Tehran",
    city: "Tehran",
    address: "Example street",
    postal_code: "1234567890",
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
    ],
    ...overrides,
  };
}

describe("OrderShipmentTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the seller, tracking number, carrier and events", async () => {
    mockedGetOrderShipments.mockResolvedValue([makeShipment()]);

    render(<OrderShipmentTracking orderId={9} />);

    expect(await screen.findByText("SHP-20260917-44F730")).toBeInTheDocument();

    expect(screen.getByText("Seller A")).toBeInTheDocument();

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

    expect(mockedGetOrderShipments).toHaveBeenCalledWith(9);
  });

  it("shows two separate shipments for two sellers", async () => {
    mockedGetOrderShipments.mockResolvedValue([
      makeShipment(),

      makeShipment({
        id: 3,
        seller: 12,
        seller_name: "Seller B",
        shipment_number: "SHP-SELLER-B",
        status: "delivered",
        status_display: "Delivered",
        tracking_number: "DHL-999",
        tracking_url: "https://tracking.example.com/DHL-999",
        events: [],
      }),
    ]);

    render(<OrderShipmentTracking orderId={9} />);

    expect(await screen.findByText("Seller A")).toBeInTheDocument();

    expect(screen.getByText("Seller B")).toBeInTheDocument();

    expect(screen.getByText("TPX-123456")).toBeInTheDocument();

    expect(screen.getByText("DHL-999")).toBeInTheDocument();

    expect(screen.getByText("2 shipments for this order.")).toBeInTheDocument();
  });

  it("shows an empty state when no shipment exists", async () => {
    mockedGetOrderShipments.mockResolvedValue([]);

    render(<OrderShipmentTracking orderId={9} />);

    expect(
      await screen.findByText(/no shipment has been created yet/i),
    ).toBeInTheDocument();
  });

  it("shows delivered shipment information", async () => {
    mockedGetOrderShipments.mockResolvedValue([
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
    ]);

    render(<OrderShipmentTracking orderId={9} />);

    expect(await screen.findByText("Delivered")).toBeInTheDocument();

    expect(screen.getByText("Shipped → Delivered")).toBeInTheDocument();

    expect(screen.getByText("Shipment delivered.")).toBeInTheDocument();
  });

  it("shows an error when shipment loading fails", async () => {
    mockedGetOrderShipments.mockRejectedValue(
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
