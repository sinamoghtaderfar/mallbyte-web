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

export type SellerFulfillmentStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

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

  // Nullable for shipments created before seller-specific shipping.
  seller_fulfillment?: number | null;
  seller?: number | null;
  seller_name?: string | null;
  seller_status?: SellerFulfillmentStatus | null;

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

export type EligibleShipmentSeller = {
  id: number;
  name: string;
  status: SellerFulfillmentStatus;
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

  eligible_sellers?: EligibleShipmentSeller[];
  requires_seller_selection?: boolean;
};

type PaginatedShipmentsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ShipmentListItem[];
};

export type CreateShipmentPayload = {
  order: number;
  seller?: number;
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

/**
 * Get all shipments visible to the current user.
 * Supports both plain arrays and paginated DRF responses.
 */
export async function getShipments(): Promise<ShipmentListItem[]> {
  const shipments: ShipmentListItem[] = [];
  let next: string | null = API_ENDPOINTS.shipping.shipments;

  const visited = new Set<string>();

  while (next && !visited.has(next)) {
    const url: string = next;
    visited.add(url);

    const response = await apiClient.get<
      ShipmentListItem[] | PaginatedShipmentsResponse
    >(url);

    if (Array.isArray(response.data)) {
      shipments.push(...response.data);
      break;
    }

    shipments.push(...response.data.results);
    next = response.data.next;
  }

  return shipments;
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

/**
 * Retrieve all shipments for one buyer's order.
 * An order may have separate shipments from different sellers.
 */
export async function getOrderShipments(
  orderId: number | string,
): Promise<ShipmentDetail[]> {
  const shipments = await getShipments();

  const orderShipments = shipments
    .filter((shipment) => shipment.order === Number(orderId))
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    );

  return Promise.all(
    orderShipments.map((shipment) => getShipment(shipment.id)),
  );
}

/**
 * Backward compatibility for components that need
 * only the most recent shipment.
 */
export async function getOrderShipment(orderId: number | string) {
  const shipments = await getShipments();

  const orderShipments = shipments
    .filter((shipment) => shipment.order === Number(orderId))
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    );

  return orderShipments.length ? getShipment(orderShipments[0].id) : null;
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
