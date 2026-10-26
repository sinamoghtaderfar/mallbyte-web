import { apiClient } from "@/lib/api/client";
import type {
  AdminDashboardResponse,
  AuditQueuedResponse,
  AdminTimeSeriesResponse,
  AuditAlert,
  AuditRun,
  AuditRunDetail,
  PageResult,
  Period,
  SellerDashboardResponse,
  SellerProductsResponse,
  SellerSeriesResponse,
} from "./types";

export const INSIGHT_ENDPOINTS = {
  adminDashboard: "/api/analytics/dashboard/",
  adminTimeSeries: "/api/analytics/timeseries/",
  sellerDashboard: "/api/analytics/seller/dashboard/",
  sellerTimeSeries: "/api/analytics/seller/timeseries/",
  sellerProducts: "/api/analytics/seller/products/",
  auditRuns: "/api/settlements/admin/monitoring/runs/",
  auditRunDetail: (id: number) => `/api/settlements/admin/monitoring/runs/${id}/`,
  auditAlerts: "/api/settlements/admin/monitoring/alerts/",
  auditRunNow: "/api/settlements/admin/monitoring/run-now/",
} as const;

export async function getAdminInsights(period: Period) {
  const [dashboard, timeseries] = await Promise.all([
    apiClient.get<AdminDashboardResponse>(INSIGHT_ENDPOINTS.adminDashboard, { params: { period } }),
    apiClient.get<AdminTimeSeriesResponse>(INSIGHT_ENDPOINTS.adminTimeSeries, { params: { period } }),
  ]);
  return { dashboard: dashboard.data, timeseries: timeseries.data };
}

export async function getSellerInsights(period: Period) {
  const [dashboard, timeseries, products] = await Promise.all([
    apiClient.get<SellerDashboardResponse>(INSIGHT_ENDPOINTS.sellerDashboard, { params: { period } }),
    apiClient.get<SellerSeriesResponse>(INSIGHT_ENDPOINTS.sellerTimeSeries, { params: { period } }),
    apiClient.get<SellerProductsResponse>(INSIGHT_ENDPOINTS.sellerProducts, { params: { period, limit: 5 } }),
  ]);
  return { dashboard: dashboard.data, timeseries: timeseries.data, products: products.data };
}

export async function getAuditHistory(page = 1, pageSize = 10) {
  const [runs, alerts] = await Promise.all([
    apiClient.get<PageResult<AuditRun>>(INSIGHT_ENDPOINTS.auditRuns, {
      params: { page, page_size: pageSize },
    }),
    apiClient.get<PageResult<AuditAlert>>(INSIGHT_ENDPOINTS.auditAlerts, {
      params: { page: 1, page_size: 50 },
    }),
  ]);
  return { runs: runs.data, alerts: alerts.data };
}

export async function getAuditRunDetail(id: number) {
  const { data } = await apiClient.get<AuditRunDetail>(INSIGHT_ENDPOINTS.auditRunDetail(id));
  return data;
}

/** Permission: manage_analytics_reports. Never used automatically on page load. */
export async function startManualAudit() {
  const { data } = await apiClient.post<AuditQueuedResponse>(INSIGHT_ENDPOINTS.auditRunNow, {
    sample_limit: 20,
  });
  return data;
}

/** Returns a saved run as soon as the worker has persisted it. */
export async function findAuditRunByKey(runKey: string) {
  const { data } = await apiClient.get<PageResult<AuditRun>>(
    INSIGHT_ENDPOINTS.auditRuns,
    { params: { run_key: runKey, page: 1, page_size: 1 } },
  );
  return data.results[0] ?? null;
}
