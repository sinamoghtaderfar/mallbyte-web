import type { SellerReturnListItem } from "../api";
export const records: SellerReturnListItem[] = Array.from(
  { length: 21 },
  (_, index) => ({
    id: index + 1,
    request_number: `RET-${index + 1}`,
    customer: "Customer",
    order: index + 1,
    order_number: `ORD-${index + 1}`,
    status: index === 20 ? "refunded" : "submitted",
    reason: "damaged",
    requested_resolution: "refund",
    refund_method: "original",
    total_requested_amount: "120000",
    total_approved_amount: "0",
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  }),
);
export const page = (
  results = records.slice(0, 20),
  count = 21,
  next: string | null = "?page=2",
  previous: string | null = null,
) => ({ results, count, next, previous });
