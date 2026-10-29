import type { AlertRow, ErrorRow, HealthSnapshot, Metrics, ObsAccess, RequestRow, WindowKey } from "./types";

export const OBS_TIME = "2026-10-28T18:00:00.000Z";
export const healthFixture: HealthSnapshot = {
  id: "health-1", status: "healthy", is_stale: false, created_at: OBS_TIME,
  hostname: "test-host", cpu_percent: "10.2", memory_percent: "42.1", disk_percent: "30.1",
  database_status: "healthy", redis_status: "healthy", celery_status: "healthy",
  celery_beat_status: "healthy", database_latency_ms: "2.1", redis_latency_ms: "1.0",
};
export const metricsFixture: Metrics = {
  window_key: "24h" as WindowKey,
  requests_count: 1234, error_logs_count: 3, open_alerts_count: 2,
  slow_requests_count: 9, average_duration_ms: "123.5", p95_duration_ms: "345.4",
  error_rate_percent: 1.25, status_codes: [{status_code: 200, count: 1200}],
  top_paths: [{path: "/api/orders/", count: 8}],
  open_alerts_by_severity: [{severity: "critical", count: 2}],
  request_trend: [{bucket: OBS_TIME, requests: 12, average_ms: 100}],
};
export const alertFixture: AlertRow = {
  id: "alert-1", title: "Celery not responding", message: "Worker health failed",
  status: "open", severity: "critical", alert_type: "system", source: "celery",
  created_at: OBS_TIME, updated_at: OBS_TIME,
};
export const errorFixture: ErrorRow = {
  id: "error-1", severity: "critical", exception_type: "DatabaseError",
  message: "Sensitive exception details", status_code: 500,
  path: "/api/orders/", is_resolved: false, created_at: OBS_TIME,
};
export const requestFixture: RequestRow = {
  id: "request-1", method: "POST", path: "/api/orders/", status_code: 500,
  duration_ms: 1100, created_at: OBS_TIME,
};
export const viewerAccess: ObsAccess = {
  view: true, viewLogs: false, viewSensitive: false, viewAudit: false,
  manageAlerts: false, resolveErrors: false, viewIncidents: true,
  createIncidents: false, viewOps: false,
};
export const operatorAccess: ObsAccess = {
  ...viewerAccess, viewLogs: true, manageAlerts: true, createIncidents: true,
  viewOps: true,
};
export const adminAccess: ObsAccess = {
  ...operatorAccess, viewSensitive: true, viewAudit: true, resolveErrors: true,
};
export const paged = <T,>(results: T[], options: { next?: string | null; previous?: string | null; count?: number } = {}) => ({
  results, count: options.count ?? results.length,
  next: options.next ?? null, previous: options.previous ?? null,
});
