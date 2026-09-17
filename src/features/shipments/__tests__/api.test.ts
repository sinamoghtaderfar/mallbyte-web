import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
  cancelShipment,
  createShipment,
  getEligibleShipmentOrders,
  getShipment,
  getShipmentCarrierLabel,
  getShipments,
  getShipmentStatusLabel,
  markShipmentDelivered,
  markShipmentReady,
  markShipmentShipped,
  type EligibleShipmentOrder,
  type ShipmentDetail,
  type ShipmentListItem,
} from "../api";

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

function makeShipmentListItem(
  overrides: Partial<ShipmentListItem> = {},
): ShipmentListItem {
  return {
    id: 1,
    shipment_number: "SHP-20260917-ABC123",
    order: 7,
    order_number: "ORD-20260916-AAAAAA",
    user: 1,
    user_email: "sina@example.com",
    carrier: "post",
    carrier_display: "Post",
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

function makeShipmentDetail(
  overrides: Partial<ShipmentDetail> = {},
): ShipmentDetail {
  return {
    ...makeShipmentListItem(),
    user_full_name: "Sina Moghtader Far",
    tracking_url: "",
    receiver_name: "Sina",
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

function makeEligibleOrder(
  overrides: Partial<EligibleShipmentOrder> = {},
): EligibleShipmentOrder {
  return {
    id: 7,
    order_number: "ORD-20260916-AAAAAA",
    user: 1,
    user_email: "sina@example.com",
    user_full_name: "Sina Moghtader Far",
    total_amount: "1450000",
    shipping_cost: "0",
    receiver_name: "Sina",
    receiver_phone: "+4917612345678",
    province: "Bavaria",
    city: "Bamberg",
    paid_at: "2026-09-16T18:00:00Z",
    created_at: "2026-09-16T17:00:00Z",
    ...overrides,
  };
}

describe("shipments api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns shipments when the API responds with a plain array", async () => {
    const shipments = [makeShipmentListItem()];

    mockedGet.mockResolvedValue({ data: shipments });

    await expect(getShipments()).resolves.toEqual(shipments);
    expect(mockedGet).toHaveBeenCalledWith(API_ENDPOINTS.shipping.shipments);
  });

  it("unwraps paginated shipment responses", async () => {
    const shipments = [makeShipmentListItem()];

    mockedGet.mockResolvedValue({
      data: {
        count: 1,
        next: null,
        previous: null,
        results: shipments,
      },
    });

    await expect(getShipments()).resolves.toEqual(shipments);
  });

  it("gets eligible paid orders", async () => {
    const orders = [makeEligibleOrder()];

    mockedGet.mockResolvedValue({ data: orders });

    await expect(getEligibleShipmentOrders()).resolves.toEqual(orders);
    expect(mockedGet).toHaveBeenCalledWith(
      API_ENDPOINTS.shipping.eligibleOrders,
    );
  });

  it("gets one shipment by id", async () => {
    const shipment = makeShipmentDetail();

    mockedGet.mockResolvedValue({ data: shipment });

    await expect(getShipment(12)).resolves.toEqual(shipment);
    expect(mockedGet).toHaveBeenCalledWith(API_ENDPOINTS.shipping.detail(12));
  });

  it("creates a shipment with the selected carrier", async () => {
    const shipment = makeShipmentDetail({
      carrier: "dhl",
      carrier_display: "DHL",
    });

    mockedPost.mockResolvedValue({ data: shipment });

    await expect(createShipment({ order: 7, carrier: "dhl" })).resolves.toEqual(
      shipment,
    );

    expect(mockedPost).toHaveBeenCalledWith(API_ENDPOINTS.shipping.shipments, {
      order: 7,
      carrier: "dhl",
    });
  });

  it("marks a shipment as ready", async () => {
    const shipment = makeShipmentDetail({
      status: "ready_to_ship",
      status_display: "Ready to ship",
    });

    mockedPost.mockResolvedValue({ data: shipment });

    await expect(
      markShipmentReady(1, { note: "Package prepared" }),
    ).resolves.toEqual(shipment);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.shipping.markReady(1),
      { note: "Package prepared" },
    );
  });

  it("marks a shipment as shipped with tracking data", async () => {
    const shipment = makeShipmentDetail({
      status: "shipped",
      status_display: "Shipped",
      tracking_number: "TPX-123456",
      tracking_url: "https://tracking.example.com/TPX-123456",
      shipped_at: "2026-09-17T19:30:00Z",
    });

    mockedPost.mockResolvedValue({ data: shipment });

    const payload = {
      tracking_number: "TPX-123456",
      tracking_url: "https://tracking.example.com/TPX-123456",
      note: "Handed to carrier",
    };

    await expect(markShipmentShipped(1, payload)).resolves.toEqual(shipment);
    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.shipping.markShipped(1),
      payload,
    );
  });

  it("marks a shipment as delivered", async () => {
    const shipment = makeShipmentDetail({
      status: "delivered",
      status_display: "Delivered",
      delivered_at: "2026-09-17T20:00:00Z",
    });

    mockedPost.mockResolvedValue({ data: shipment });

    await expect(
      markShipmentDelivered(1, { note: "Delivered to customer" }),
    ).resolves.toEqual(shipment);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.shipping.markDelivered(1),
      { note: "Delivered to customer" },
    );
  });

  it("cancels a shipment", async () => {
    const shipment = makeShipmentDetail({
      status: "cancelled",
      status_display: "Cancelled",
      cancelled_at: "2026-09-17T20:00:00Z",
    });

    mockedPost.mockResolvedValue({ data: shipment });

    await expect(
      cancelShipment(1, { note: "Cancelled by admin" }),
    ).resolves.toEqual(shipment);

    expect(mockedPost).toHaveBeenCalledWith(API_ENDPOINTS.shipping.cancel(1), {
      note: "Cancelled by admin",
    });
  });

  it("formats known and unknown status and carrier labels", () => {
    expect(getShipmentStatusLabel("ready_to_ship")).toBe("Ready to ship");
    expect(getShipmentStatusLabel("custom_status")).toBe("custom status");
    expect(getShipmentCarrierLabel("tipax")).toBe("Tipax");
    expect(getShipmentCarrierLabel("custom-carrier")).toBe("custom-carrier");
  });
});
