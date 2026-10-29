import axios from "axios";
import { apiClient } from "@/lib/api/client";
import type {
  AlertRow, AuditRow, ErrorRow, HealthHistory, HealthSnapshot,
  ListPage, Metrics, RequestRow, TaskRow, WindowKey,
} from "./types";

const root = "/api/observability";
export function apiError(error: unknown): string {
  if (!axios.isAxiosError(error)) return "An unexpected error occurred.";
  const data: unknown = error.response?.data;
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as {detail?: unknown}).detail;
    if (typeof detail === "string") return detail.slice(0, 280);
  }
  if (error.response?.status === 403) return "Access denied. Your Observability role does not allow this operation.";
  if (error.response?.status === 401) return "Session expired. Please sign in again.";
  if (error.response?.status === 503) return "No current health snapshot. Check the scheduled Celery collector.";
  return `Request failed (${error.response?.status ?? "network error"}).`;
}

// Always use a local page number, never follow user-provided remote pagination URLs.
export async function listPage<T>(path: string, params: Record<string, string|number|undefined> = {}) {
  const { data } = await apiClient.get<ListPage<T>>(`${root}/${path}/`, {params});
  return data;
}
export const observabilityAPI = {
  health: async () => (await apiClient.get<HealthSnapshot>(`${root}/health/`)).data,
  metrics: async (window:WindowKey) => (await apiClient.get<Metrics>(`${root}/stats/`, {params: {window}})).data,
  history: () => listPage<HealthHistory>("system-health-snapshots", {page:1}),
  alerts: (page:number, status?:string) => listPage<AlertRow>("alerts", {page, status:status||undefined}),
  requests: (page:number, query:string, method:string) => listPage<RequestRow>("request-logs", {page,path:query||undefined,method:method||undefined}),
  errors: (page:number, severity:string, unresolved:boolean) => listPage<ErrorRow>("error-logs", {page,severity:severity||undefined,is_resolved:unresolved?"false":undefined}),
  tasks: (page:number,status:string) => listPage<TaskRow>("celery-task-logs", {page,status:status||undefined}),
  audits: (page:number) => listPage<AuditRow>("audit-logs",{page}),
  alertAction: (id:string, action:"acknowledge"|"resolve") => apiClient.post(`${root}/alerts/${encodeURIComponent(id)}/${action}/`),
  resolveError: (id:string) => apiClient.post(`${root}/error-logs/${encodeURIComponent(id)}/resolve/`),
  createIncidentFromError: (record: ErrorRow) => apiClient.post(`${root}/incidents/`, {
    title: `Investigate ${record.exception_type || "API error"}`.slice(0,180),
    description: `Observed ${record.status_code} on ${record.path || "unavailable path"}. Review linked error evidence.`,
    severity: record.severity === "critical" ? "critical" : "medium",
    source_error: record.id,
  }),
};
