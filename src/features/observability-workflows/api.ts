import axios from "axios";
import { apiClient } from "@/lib/api/client";
import type { AIDiagnosis, Incident, IncidentEvent, InfrastructureOperation, Page } from "./types";

const prefix = "/api/observability";

export function errorText(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail: unknown = error.response?.data?.detail;
    if (typeof detail === "string") return detail.slice(0, 300);
    if (error.response?.status === 403) return "You do not have permission for this action.";
    return `Request failed (HTTP ${error.response?.status ?? "network"}).`;
  }
  return "An unexpected error occurred.";
}

export const workflowAPI = {
  async listIncidents(page = 1): Promise<Page<Incident>> {
    const { data } = await apiClient.get<Page<Incident>>(`${prefix}/incidents/`, { params: { page } });
    return data;
  },
  async createIncident(body: { title: string; description: string; severity: string; source_error?: string; source_alert?: string }): Promise<Incident> {
    const { data } = await apiClient.post<Incident>(`${prefix}/incidents/`, body);
    return data;
  },
  async incidentEvents(id: string): Promise<IncidentEvent[]> {
    const { data } = await apiClient.get<IncidentEvent[]>(`${prefix}/incidents/${encodeURIComponent(id)}/events/`);
    return data;
  },
  async diagnoses(id: string): Promise<AIDiagnosis[]> {
    const { data } = await apiClient.get<AIDiagnosis[]>(`${prefix}/incidents/${encodeURIComponent(id)}/diagnoses/`);
    return data;
  },
  async transition(id: string, status: string, note: string): Promise<Incident> {
    const { data } = await apiClient.post<Incident>(`${prefix}/incidents/${encodeURIComponent(id)}/transition/`, { status, note });
    return data;
  },
  async assign(id: string, userId: number): Promise<Incident> {
    const { data } = await apiClient.post<Incident>(`${prefix}/incidents/${encodeURIComponent(id)}/assign/`, { user_id: userId });
    return data;
  },
  async comment(id: string, note: string): Promise<void> {
    await apiClient.post(`${prefix}/incidents/${encodeURIComponent(id)}/comment/`, { note });
  },
  async diagnose(id: string, includeDescription: boolean): Promise<AIDiagnosis> {
    const { data } = await apiClient.post<AIDiagnosis>(`${prefix}/incidents/${encodeURIComponent(id)}/diagnose/`, { include_description: includeDescription, consent_to_external_processing: true }, { timeout: 15000 });
    return data;
  },
  async listOperations(page = 1): Promise<Page<InfrastructureOperation>> {
    const { data } = await apiClient.get<Page<InfrastructureOperation>>(`${prefix}/operations/`, { params: { page } });
    return data;
  },
  async requestOperation(target: string, reason: string): Promise<InfrastructureOperation> {
    const { data } = await apiClient.post<InfrastructureOperation>(`${prefix}/operations/`, { target, reason });
    return data;
  },
  async operationAction(id: string, action: "approve" | "reject" | "cancel"): Promise<void> {
    await apiClient.post(`${prefix}/operations/${encodeURIComponent(id)}/${action}/`);
  },
};
