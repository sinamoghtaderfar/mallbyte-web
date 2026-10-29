export type WorkflowAccess = {
  viewIncidents: boolean;
  createIncidents: boolean;
  assignIncidents: boolean;
  manageIncidents: boolean;
  requestAI: boolean;
  viewOps: boolean;
  requestOps: boolean;
  approveOps: boolean;
};

export type Incident = {
  id: string;
  title?: string;
  description?: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "mitigated" | "resolved" | "closed";
  assigned_to: number | null;
  source_error?: string | null;
  source_alert?: string | null;
  created_at: string;
  updated_at: string;
};

export type IncidentEvent = {
  id: string;
  event_type: string;
  actor: number | null;
  note: string;
  from_value: string;
  to_value: string;
  created_at: string;
};

export type AIDiagnosis = {
  id: string;
  response: string;
  model_name: string;
  status: "queued" | "running" | "succeeded" | "failed";
  created_at: string;
  updated_at: string;
};

export type InfrastructureOperation = {
  id: string;
  target: "celery_worker" | "celery_beat" | "redis";
  status: string;
  reason: string;
  requested_by: number | null;
  approved_by: number | null;
  created_at: string;
  expires_at: string;
  result_message: string;
};

export type Page<T> = { count: number; results: T[]; next: string | null; previous: string | null };
