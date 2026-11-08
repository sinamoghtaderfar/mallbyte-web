import type { AdminSeller } from "../api";

// SellerSerializer at mallbyte-api 43f2459: nested user, business_phone,
// and no rejection_reason or updated_at in the response.
export function makeSeller(
  overrides: Partial<AdminSeller> = {},
): AdminSeller {
  return {
    id: 17,
    user: {
      id: 42,
      email: "owner@example.test",
      phone: null,
      full_name: "Store Owner",
      is_seller: overrides.status === "approved",
      is_staff: false,
      is_superuser: false,
      email_verified: true,
    },
    store_name: "Registered Store",
    business_email: "store@example.test",
    business_phone: "+4917612345678",
    status: "pending",
    commission_rate: "5.00",
    total_sales: "2500000.00",
    total_orders: 12,
    balance: "150000.00",
    verified_at: null,
    created_at: "2026-11-01T10:00:00Z",
    ...overrides,
  };
}
