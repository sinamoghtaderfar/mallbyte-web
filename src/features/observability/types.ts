export type ListPage<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export type WindowKey = "1h" | "6h" | "24h" | "7d";

export type HealthSnapshot = {
  id: string;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  is_stale?: boolean;
  stale_after_seconds?: number;
  created_at: string;
  hostname?: string;
  cpu_percent: string | number | null;
  memory_percent: string | number | null;
  disk_percent: string | number | null;
  database_status: string;
  redis_status: string;
  celery_status: string;
  celery_beat_status: string;
  database_latency_ms: number | string | null;
  redis_latency_ms: number | string | null;
};
export type HealthHistory = Pick<HealthSnapshot,"id"|"created_at"|"status"|"cpu_percent"|"memory_percent"|"disk_percent">;
export type RequestTrend = { bucket: string; requests: number; average_ms: number | string | null };
export type Metrics = {
  window_key: WindowKey;
  requests_count: number;
  error_logs_count: number;
  open_alerts_count: number;
  slow_requests_count: number;
  average_duration_ms: number | string;
  p95_duration_ms: number | string;
  error_rate_percent: number;
  status_codes: {status_code: number; count: number}[];
  top_paths: {path: string; count: number}[];
  open_alerts_by_severity: {severity: string; count: number}[];
  request_trend: RequestTrend[];
};
export type AlertRow = {
  id:string; title:string; message:string; status:string; severity:string;
  alert_type:string; source:string; created_at:string; updated_at:string;
};
export type RequestRow = {
  id:string; method:string; path:string; status_code:number; duration_ms:number;
  created_at:string; is_slow?:boolean; is_error?:boolean; request_id?:string;
};
export type ErrorRow = {
  id:string; severity:string; exception_type:string; message?:string;
  status_code:number; path:string; is_resolved:boolean; created_at:string;
  fingerprint?:string; traceback?:string;
};
export type TaskRow = {
  id:string; task_name:string; status:string; task_id:string; queue?:string;
  created_at:string; duration_ms?:number | null; error_message?:string;
};
export type AuditRow = {
  id:string; action:string; object_type:string; object_id:string;
  description:string; actor_display?:string | null; created_at:string;
};
export type ObsAccess = {
  view:boolean; viewLogs:boolean; viewSensitive:boolean; viewAudit:boolean;
  manageAlerts:boolean; resolveErrors:boolean;
  viewIncidents:boolean; createIncidents:boolean; viewOps:boolean;
};
