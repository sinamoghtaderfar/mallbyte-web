import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

export type ShipmentStatus =
  | "pending"
  | "ready_to_ship"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned"
  | "cancelled";

export type ShipmentCarrier = "post" | "dhl" | "tipax" | "snapbox" | "other";

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: "Pending",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  failed: "Failed",
  returned: "Returned",
  cancelled: "Cancelled",
};

export const SHIPMENT_CARRIER_LABELS: Record<ShipmentCarrier, string> = {
  post: "Post",
  dhl: "DHL",
  tipax: "Tipax",
  snapbox: "Snapbox",
  other: "Other",
};

export function getShipmentStatusLabel(status: string) {
  return (
    SHIPMENT_STATUS_LABELS[status as ShipmentStatus] ??
    status.replaceAll("_", " ")
  );
}

export function getShipmentCarrierLabel(carrier: string) {
  return SHIPMENT_CARRIER_LABELS[carrier as ShipmentCarrier] ?? carrier;
}

export type ShipmentListItem = {
  id: number;
  shipment_number: string;
  order: number;
  order_number: string;
  user: number;
  user_email: string;
  carrier: ShipmentCarrier;
  carrier_display: string;
  status: ShipmentStatus;
  status_display: string;
  tracking_number: string;
  shipping_cost: string;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
};

export type ShipmentEvent = {
  id: number;
  old_status: ShipmentStatus | "" | null;
  new_status: ShipmentStatus;
  message: string;
  data: Record<string, unknown>;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
};

export type ShipmentDetail = ShipmentListItem & {
  user_full_name: string;
  tracking_url: string;
  receiver_name: string;
  receiver_phone: string;
  province: string;
  city: string;
  address: string;
  postal_code: string;
  notes: string;
  cancelled_at: string | null;
  created_by: number | null;
  updated_at: string;
  events: ShipmentEvent[];
};

export type EligibleShipmentOrder = {
  id: number;
  order_number: string;
  user: number;
  user_email: string;
  user_full_name: string;
  total_amount: string;
  shipping_cost: string;
  receiver_name: string;
  receiver_phone: string;
  province: string;
  city: string;
  paid_at: string | null;
  created_at: string;
};

type PaginatedShipmentsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ShipmentListItem[];
};

export type CreateShipmentPayload = {
  order: number;
  carrier?: ShipmentCarrier;
};

export type ShipmentNotePayload = {
  note?: string;
};

export type MarkShippedPayload = {
  tracking_number?: string;
  tracking_url?: string;
  note?: string;
};

export async function getShipments() {
  const response = await apiClient.get<
    ShipmentListItem[] | PaginatedShipmentsResponse
  >(API_ENDPOINTS.shipping.shipments);

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return response.data.results;
}

export async function getEligibleShipmentOrders() {
  const response = await apiClient.get<EligibleShipmentOrder[]>(
    API_ENDPOINTS.shipping.eligibleOrders,
  );

  return response.data;
}

export async function getShipment(shipmentId: number | string) {
  const response = await apiClient.get<ShipmentDetail>(
    API_ENDPOINTS.shipping.detail(shipmentId),
  );

  return response.data;
}

export async function getOrderShipment(orderId: number | string) {
  const shipments = await getShipments();
  const normalizedOrderId = Number(orderId);

  const orderShipments = shipments
    .filter((shipment) => shipment.order === normalizedOrderId)
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    );

  if (orderShipments.length === 0) {
    return null;
  }

  return getShipment(orderShipments[0].id);
}

export async function createShipment(payload: CreateShipmentPayload) {
  const response = await apiClient.post<ShipmentDetail>(
    API_ENDPOINTS.shipping.shipments,
    payload,
  );

  return response.data;
}

export async function markShipmentReady(
  shipmentId: number | string,
  payload: ShipmentNotePayload,
) {
  const response = await apiClient.post<ShipmentDetail>(
    API_ENDPOINTS.shipping.markReady(shipmentId),
    payload,
  );

  return response.data;
}

export async function markShipmentShipped(
  shipmentId: number | string,
  payload: MarkShippedPayload,
) {
  const response = await apiClient.post<ShipmentDetail>(
    API_ENDPOINTS.shipping.markShipped(shipmentId),
    payload,
  );

  return response.data;
}

export async function markShipmentDelivered(
  shipmentId: number | string,
  payload: ShipmentNotePayload,
) {
  const response = await apiClient.post<ShipmentDetail>(
    API_ENDPOINTS.shipping.markDelivered(shipmentId),
    payload,
  );

  return response.data;
}

export async function cancelShipment(
  shipmentId: number | string,
  payload: ShipmentNotePayload,
) {
  const response = await apiClient.post<ShipmentDetail>(
    API_ENDPOINTS.shipping.cancel(shipmentId),
    payload,
  );

  return response.data;
}
