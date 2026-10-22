import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api/client";
import {
  fetchAdminBalances,
  fetchPayoutEligibility,
  fetchReconciliation,
  fetchSellerStatement,
  SETTLEMENT_ENDPOINTS,
} from "../api";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn() },
}));

const get = vi.mocked(apiClient.get);

describe("settlements API contract", () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: {} });
  });

  it("gets the authenticated seller statement without a supplied seller ID", async () => {
    await fetchSellerStatement();
    expect(get).toHaveBeenCalledWith(SETTLEMENT_ENDPOINTS.sellerStatement);
  });

  it("gets payout eligibility for an explicit currency", async () => {
    await fetchPayoutEligibility("IRR");
    expect(get).toHaveBeenCalledWith(SETTLEMENT_ENDPOINTS.payoutEligibility, {
      params: { currency: "IRR" },
    });
  });

  it("requests reconciliation samples within the supported API", async () => {
    await fetchReconciliation(20);
    expect(get).toHaveBeenCalledWith(SETTLEMENT_ENDPOINTS.reconciliation, {
      params: { sample_limit: 20 },
    });
  });

  it("passes admin balance filters and pagination to the backend", async () => {
    await fetchAdminBalances({ seller_id: 5, currency: "IRR", page: 2, page_size: 20 });
    expect(get).toHaveBeenCalledWith(SETTLEMENT_ENDPOINTS.balances, {
      params: { seller_id: 5, currency: "IRR", page: 2, page_size: 20 },
    });
  });
});
