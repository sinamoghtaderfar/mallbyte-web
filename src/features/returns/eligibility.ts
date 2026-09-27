import type { OrderDetail } from "@/features/orders/types";
import {
  getOrderShipments,
  type ShipmentDetail,
} from "@/features/shipments/api";
import { getReturnRequest, getReturns } from "./api";
import type { ReturnDetail } from "./types";

/** A single source of truth for customer-side return eligibility. */
export function calculateReturnableQuantities(
  order: OrderDetail,
  shipments: ShipmentDetail[],
  existingReturns: ReturnDetail[],
): Record<number, number> {
  const eligible: Record<number, number> = {};
  if (
    order.payment_status !== "paid" ||
    ["pending_payment", "cancelled", "refunded"].includes(order.status)
  ) {
    return eligible;
  }

  // Never treat a shipped parcel as delivered. An order can contain several sellers.
  const sellerShipments = shipments.filter((s) => s.seller != null);
  const deliveredSellerIds = new Set(
    sellerShipments
      .filter((s) => s.status === "delivered")
      .map((s) => Number(s.seller)),
  );
  // Historical order-wide shipments have no seller ID. Only trust the legacy
  // whole-order delivered state if there are no seller-specific shipments.
  const legacyDelivered =
    order.status === "delivered" && sellerShipments.length === 0;
  const claimed: Record<number, number> = {};
  for (const request of existingReturns) {
    if (["rejected", "cancelled"].includes(request.status)) continue;
    for (const item of request.items) {
      claimed[item.order_item_id] =
        (claimed[item.order_item_id] ?? 0) + item.quantity;
    }
  }
  for (const item of order.items) {
    const delivered =
      legacyDelivered ||
      (typeof item.seller_id === "number" &&
        deliveredSellerIds.has(item.seller_id));
    const remaining = Math.max(0, item.quantity - (claimed[item.id] ?? 0));
    eligible[item.id] = delivered ? remaining : 0;
  }
  return eligible;
}

export async function getReturnAvailability(
  order: OrderDetail,
): Promise<Record<number, number>> {
  const [shipments, returns] = await Promise.all([
    getOrderShipments(order.id),
    getReturns(),
  ]);
  const forOrder = returns.filter((r) => r.order === order.id);
  const details = await Promise.all(
    forOrder.map((r) => getReturnRequest(r.id)),
  );
  return calculateReturnableQuantities(order, shipments, details);
}
