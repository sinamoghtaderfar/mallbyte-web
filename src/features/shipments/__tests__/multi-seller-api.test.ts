import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import {
  createShipment,
  getOrderShipments,
  getShipments,
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

function makeShipment(id: number, sellerId: number): ShipmentListItem {
  return {
    id,
    shipment_number: `SHP-${id}`,
    order: 9,
    order_number: "ORDER-9",
    user: 1,
    user_email: "buyer@example.com",
    seller: sellerId,
    seller_name: `Seller ${sellerId}`,
    seller_fulfillment: sellerId + 100,
    seller_status: "paid",
    carrier: "post",
    carrier_display: "Post",
    status: "pending",
    status_display: "Pending",
    tracking_number: "",
    shipping_cost: "0",
    created_at: `2026-09-25T12:00:0${id}Z`,
    shipped_at: null,
    delivered_at: null,
  };
}

describe("Multi-seller shipment API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads all paginated shipments", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        count: 2,
        next: "/api/shipping/shipments/?page=2",
        previous: null,
        results: [makeShipment(1, 11)],
      },
    });

    mockedGet.mockResolvedValueOnce({
      data: {
        count: 2,
        next: null,
        previous: API_ENDPOINTS.shipping.shipments,
        results: [makeShipment(2, 12)],
      },
    });

    const shipments = await getShipments();

    expect(shipments).toHaveLength(2);
    expect(shipments[0].seller).toBe(11);
    expect(shipments[1].seller).toBe(12);

    expect(mockedGet).toHaveBeenNthCalledWith(
      2,
      "/api/shipping/shipments/?page=2",
    );
  });

  it("returns every seller shipment belonging to one order", async () => {
    mockedGet.mockResolvedValueOnce({
      data: [
        makeShipment(1, 11),
        makeShipment(2, 12),
        {
          ...makeShipment(3, 13),
          order: 99,
        },
      ],
    });

    mockedGet.mockResolvedValueOnce({
      data: {
        id: 2,
        seller: 12,
      },
    });

    mockedGet.mockResolvedValueOnce({
      data: {
        id: 1,
        seller: 11,
      },
    });

    const shipments = await getOrderShipments(9);

    expect(shipments).toHaveLength(2);

    expect(shipments.map((shipment) => shipment.seller)).toEqual([12, 11]);

    expect(mockedGet).toHaveBeenCalledWith(API_ENDPOINTS.shipping.detail(1));

    expect(mockedGet).toHaveBeenCalledWith(API_ENDPOINTS.shipping.detail(2));

    expect(mockedGet).not.toHaveBeenCalledWith(
      API_ENDPOINTS.shipping.detail(3),
    );
  });

  it("sends the selected seller when creating a shipment", async () => {
    mockedPost.mockResolvedValue({
      data: {
        id: 10,
        seller: 12,
      },
    });

    await createShipment({
      order: 9,
      seller: 12,
      carrier: "dhl",
    });

    expect(mockedPost).toHaveBeenCalledWith(API_ENDPOINTS.shipping.shipments, {
      order: 9,
      seller: 12,
      carrier: "dhl",
    });
  });

  it("supports legacy orders without a seller selection", async () => {
    mockedPost.mockResolvedValue({
      data: {
        id: 11,
        seller: null,
      },
    });

    await createShipment({
      order: 15,
      carrier: "post",
    });

    expect(mockedPost).toHaveBeenCalledWith(API_ENDPOINTS.shipping.shipments, {
      order: 15,
      carrier: "post",
    });
  });
});
