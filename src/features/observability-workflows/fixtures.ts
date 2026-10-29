import type { Incident, InfrastructureOperation, WorkflowAccess, AIDiagnosis, IncidentEvent } from "./types";
export const T = "2026-10-28T18:00:00.000Z";
export const incident: Incident = {
  id: "incident-1", title: "Checkout exception", description: "Synthetic failure",
  severity: "critical", status: "open", assigned_to: null, source_error: null,
  created_at: T, updated_at: T,
};
export const operation: InfrastructureOperation = {
  id: "op-1", target: "celery_worker", status: "pending", reason: "Worker stopped processing background jobs",
  requested_by: 11, approved_by: null, created_at: T, expires_at: T, result_message: "",
};
export const diagnosis: AIDiagnosis = {
  id: "diagnosis-1", status: "succeeded", model_name: "openai/gpt-oss-20b",
  response: "Verify Redis connectivity and Celery worker logs.", created_at: T, updated_at: T,
};
export const incidentEvent: IncidentEvent = {
  id: "event-1", event_type: "created", actor: 11, note: "Incident opened",
  from_value: "", to_value: "open", created_at: T,
};
export const viewer: WorkflowAccess = {
  viewIncidents: true, createIncidents: false, assignIncidents: false,
  manageIncidents: false, requestAI: false, viewOps: false,
  requestOps: false, approveOps: false,
};
export const operator: WorkflowAccess = {
  ...viewer, createIncidents: true, assignIncidents: true, manageIncidents: true,
  requestAI: true, viewOps: true, requestOps: true,
};
export const admin: WorkflowAccess = { ...operator, approveOps: true };
export const page = <T,>(results: T[], next: string | null = null) => ({results, count:results.length, next, previous:null});
