/** Types mirror mallbyte-api's existing analytics and monitoring contracts. */
export type Period = "today" | "week" | "month" | "year";

export type CashflowBucket = {
  currency: string;
  captured_amount: string;
  refunded_amount: string;
  net_cash_flow: string;
  captured_payments_count: number;
  refunded_payments_count: number;
};

export type FinancialSeries = {
  currency: string;
  points: Array<Omit<CashflowBucket, "currency"> & { date: string }>;
};

export type FinancialReport = {
  metric_contract_version: number;
  currencies: CashflowBucket[];
  series?: FinancialSeries[];
  accounting_notes: {
    metric_type: string;
    partial_refunds_supported?: boolean;
    platform_profit_calculated?: boolean;
  };
};

export type AdminDashboardResponse = {
  orders: { total_orders: number };
  products: Record<string, unknown>;
  customers: Record<string, unknown>;
  financial: FinancialReport;
};

export type AdminTimeSeriesResponse = {
  financial: FinancialReport;
};

export type SellerCurrencyMetrics = {
  currency: string;
  gross_merchandise_value: string;
  fully_refunded_merchandise_value: string; // legacy alias: now includes partial refunds
  refunded_merchandise_value?: string;
  discount_amount?: string;
  merchandise_after_discount?: string;
  net_merchandise_value: string;
  units_sold: number;
  fully_refunded_units: number;
};

export type SellerDashboardResponse = {
  scope: { type: "seller"; seller_id: number };
  currencies: SellerCurrencyMetrics[];
  catalog?: { total_products: number; active_products: number };
  accounting_notes: {
    metric_type: string;
    partial_refunds_supported: boolean;
    seller_payout_or_profit: boolean;
    seller_ownership_source: string;
  };
};

export type SellerSeriesResponse = {
  series: Array<{
    currency: string;
    points: Array<SellerCurrencyMetrics & { date: string }>;
  }>;
};

export type SellerTopProduct = {
  product_id: number;
  name: string;
  sku: string;
  gross_merchandise_value: string;
  net_merchandise_value: string;
  units_sold: number;
};

export type SellerProductsResponse = {
  products_by_currency: Array<{
    currency: string;
    products: SellerTopProduct[];
  }>;
};

export type AuditRun = {
  id: number;
  run_key: string;
  source: "manual" | "scheduled";
  status: "running" | "clean" | "warnings" | "error";
  findings_count: number;
  created_at: string;
  finished_at: string | null;
};

export type AuditRunDetail = AuditRun & {
  summary: Record<string, unknown>;
  error: string;
};

export type AuditAlert = {
  code: string;
  findings_count: number;
  sample: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at: string;
  last_run_id: number;
};

export type PageResult<T> = {
  count: number;
  page: number;
  page_size: number;
  results: T[];
};

export type AuditQueuedResponse = {
  queued: true;
  run_key: string;
  task_id: string;
  status: "queued";
};
