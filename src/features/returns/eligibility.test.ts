import { describe, expect, it } from "vitest";
import type { OrderDetail } from "@/features/orders/types";
import type { ShipmentDetail } from "@/features/shipments/api";
import type { ReturnDetail } from "./types";
import { calculateReturnableQuantities } from "./eligibility";

const order = {
  id: 12,
  payment_status: "paid",
  status: "processing",
  items: [
    { id: 10, seller_id: 1, quantity: 2 },
    { id: 11, seller_id: 3, quantity: 1 },
  ],
} as OrderDetail;
const shipped = (seller: number, status: ShipmentDetail["status"]) =>
  ({ seller, status }) as ShipmentDetail;

describe("partial multi-seller return eligibility", () => {
  it("allows only the delivered seller's product", () => {
    expect(
      calculateReturnableQuantities(
        order,
        [shipped(1, "delivered"), shipped(3, "pending")],
        [],
      ),
    ).toEqual({ 10: 2, 11: 0 });
  });
  it("subtracts previously claimed quantities, including pending claims", () => {
    const claim = {
      status: "submitted",
      items: [{ order_item_id: 10, quantity: 1 }],
    } as ReturnDetail;
    expect(
      calculateReturnableQuantities(order, [shipped(1, "delivered")], [claim]),
    ).toEqual({ 10: 1, 11: 0 });
  });
  it("ignores cancelled or rejected claims", () => {
    const claim = {
      status: "cancelled",
      items: [{ order_item_id: 10, quantity: 2 }],
    } as ReturnDetail;
    expect(
      calculateReturnableQuantities(order, [shipped(1, "delivered")], [claim]),
    ).toEqual({ 10: 2, 11: 0 });
  });
  it("allows legacy delivered orders with no seller shipments", () => {
    expect(
      calculateReturnableQuantities({ ...order, status: "delivered" }, [], []),
    ).toEqual({ 10: 2, 11: 1 });
  });
  it("does not infer delivery from payment alone", () => {
    expect(calculateReturnableQuantities(order, [], [])).toEqual({
      10: 0,
      11: 0,
    });
  });
});
