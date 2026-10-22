export type SellerLedgerCurrency = {
  currency: string;
  sales: string;
  refunds: string;
  payouts: string;
  balance: string;
};

export type SellerLedgerEntry = {
  kind: "sale" | "refund" | "payout";
  currency: string;
  amount: string;
  occurred_at: string;
};

export type SellerStatement = {
  scope: "authenticated_seller";
  currencies: SellerLedgerCurrency[];
  recent_entries: SellerLedgerEntry[];
  notice: string;
};

export type PayoutEligibility = {
  currency: string;
  ledger_balance: string;
  eligible_sale_credits: string;
  refund_and_payout_debits: string;
  withdrawable_amount: string;
  hold_days: number;
  evaluated_at: string;
  policy: string;
};

export type ReconciliationFinding = {
  count: number;
  sample_ids?: number[];
  sample_allocation_ids?: number[];
  samples?: Array<{seller_id: number; currency: string; balance: string}>;
};

export type ReconciliationReport = {
  version: number;
  scope: "platform";
  generated_at: string;
  status: "warnings" | "no_detected_mismatches";
  total_findings: number;
  sample_limit_per_check: number;
  findings: Record<string, ReconciliationFinding>;
  notes: string[];
};

export type AdminBalance = {
  seller_id: number;
  currency: string;
  balance: string;
  entry_count: number;
};

export type AdminBalancePage = {
  scope: "platform";
  count: number;
  page: number;
  page_size: number;
  results: AdminBalance[];
};

export type AdminBalanceQuery = {
  page?: number;
  page_size?: number;
  seller_id?: number;
  currency?: string;
};
