import { apiClient } from "@/lib/api/client";
import type {
    AdminBalancePage,
    AdminBalanceQuery,
    PayoutEligibility,
    ReconciliationReport,
    SellerStatement,
} from "./types";

// These endpoints exist in Stage 5/6 on mallbyte-api main.
export const SETTLEMENT_ENDPOINTS = {
  sellerStatement: "/api/settlements/seller/statement/",
  sellerExport: "/api/settlements/seller/export/",
  payoutEligibility: "/api/settlements/seller/payout-eligibility/",
  reconciliation: "/api/settlements/admin/reconciliation/",
  reconciliationExport: "/api/settlements/admin/reconciliation/export/",
  balances: "/api/settlements/admin/balances/",
  balancesExport: "/api/settlements/admin/balances/export/",
} as const;

export async function fetchSellerStatement(): Promise<SellerStatement> {
  const { data } = await apiClient.get<SellerStatement>(
    SETTLEMENT_ENDPOINTS.sellerStatement,
  );
  return data;
}

export async function fetchPayoutEligibility(
  currency: string,
): Promise<PayoutEligibility> {
  const { data } = await apiClient.get<PayoutEligibility>(
    SETTLEMENT_ENDPOINTS.payoutEligibility,
    { params: { currency } },
  );
  return data;
}

export async function fetchReconciliation(
  sampleLimit = 20,
): Promise<ReconciliationReport> {
  const { data } = await apiClient.get<ReconciliationReport>(
    SETTLEMENT_ENDPOINTS.reconciliation,
    { params: { sample_limit: sampleLimit } },
  );
  return data;
}

export async function fetchAdminBalances(
  query: AdminBalanceQuery = {},
): Promise<AdminBalancePage> {
  const { data } = await apiClient.get<AdminBalancePage>(
    SETTLEMENT_ENDPOINTS.balances,
    { params: query },
  );
  return data;
}

export async function downloadFinancialCsv(
  kind: "seller" | "reconciliation" | "balances",
  query: AdminBalanceQuery = {},
): Promise<void> {
  const destinations = {
    seller: {
      url: SETTLEMENT_ENDPOINTS.sellerExport,
      filename: "seller_statement.csv",
    },
    reconciliation: {
      url: SETTLEMENT_ENDPOINTS.reconciliationExport,
      filename: "settlement_reconciliation_summary.csv",
    },
    balances: {
      url: SETTLEMENT_ENDPOINTS.balancesExport,
      filename: "seller_ledger_balances.csv",
    },
  };
  const destination = destinations[kind];
  // Never use window.open: this endpoint requires an Authorization header.
  const { data } = await apiClient.get<Blob>(destination.url, {
    params: kind === "balances" ? query : undefined,
    responseType: "blob",
    timeout: 60000,
  });
  const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = destination.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Allow the browser's download handler to consume the object URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
