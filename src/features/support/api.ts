import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";

import type {
    CreateSupportTicketPayload,
    SupportAgent,
    SupportSummary,
    SupportTag,
    SupportTagPayload,
    SupportTicket,
    SupportTicketFilters,
    SupportTicketPriority,
    TicketAttachment,
    TicketAuditLog,
} from "./types";

type MaybePaginated<T> = PaginatedResponse<T> | T[];

function normalizePage<T>(
  data: MaybePaginated<T>,
  page: number,
): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: page > 1 ? "previous" : null,
      results: data,
    };
  }

  return data;
}

function normalizeList<T>(data: MaybePaginated<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

function cleanFilters(filters: SupportTicketFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value != null),
  );
}

export async function getSupportTickets(
  filters: SupportTicketFilters = {},
  page = 1,
  pageSize = 20,
) {
  const response = await apiClient.get<MaybePaginated<SupportTicket>>(
    API_ENDPOINTS.support.tickets,
    {
      params: {
        ...cleanFilters(filters),
        page,
        page_size: pageSize,
      },
    },
  );

  return normalizePage(response.data, page);
}

export async function getSupportTicket(ticketId: number | string) {
  const response = await apiClient.get<SupportTicket>(
    API_ENDPOINTS.support.ticketDetail(ticketId),
  );

  return response.data;
}

export async function createSupportTicket(payload: CreateSupportTicketPayload) {
  const response = await apiClient.post<SupportTicket>(
    API_ENDPOINTS.support.tickets,
    payload,
  );

  return response.data;
}

export async function getSupportSummary(
  filters: SupportTicketFilters = {},
) {
  const response = await apiClient.get<SupportSummary>(
    API_ENDPOINTS.support.summary,
    {
      params: cleanFilters(filters),
    },
  );

  return response.data;
}

export async function getSupportTags() {
  const response = await apiClient.get<MaybePaginated<SupportTag>>(
    API_ENDPOINTS.support.tags,
    {
      params: {
        page_size: 100,
      },
    },
  );

  return normalizeList(response.data);
}

export async function createSupportTag(payload: SupportTagPayload) {
  const response = await apiClient.post<SupportTag>(
    API_ENDPOINTS.support.tags,
    payload,
  );

  return response.data;
}

export async function updateSupportTag(
  tagId: number | string,
  payload: Partial<SupportTagPayload>,
) {
  const response = await apiClient.patch<SupportTag>(
    API_ENDPOINTS.support.tagDetail(tagId),
    payload,
  );

  return response.data;
}

export async function deleteSupportTag(tagId: number | string) {
  await apiClient.delete(API_ENDPOINTS.support.tagDetail(tagId));
}

export async function getSupportAgents() {
  const response = await apiClient.get<SupportAgent[]>(
    API_ENDPOINTS.support.agents,
  );

  return response.data;
}

export async function replyToSupportTicket(
  ticketId: number | string,
  message: string,
  isInternalNote = false,
) {
  const response = await apiClient.post<SupportTicket>(
    API_ENDPOINTS.support.reply(ticketId),
    {
      message,
      is_internal_note: isInternalNote,
    },
  );

  return response.data;
}

export async function downloadSupportAttachment(ticketId: number | string, attachmentId: number | string, filename: string) {
  const response = await apiClient.get<Blob>(
    API_ENDPOINTS.support.attachmentDownload(ticketId, attachmentId),
    { responseType: "blob" },
  );
  const url = URL.createObjectURL(response.data);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "attachment";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadSupportAttachment(
  ticketId: number | string,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<TicketAttachment>(
    API_ENDPOINTS.support.attachments(ticketId),
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function assignSupportTicket(
  ticketId: number | string,
  assignedTo: number,
) {
  const response = await apiClient.post<SupportTicket>(
    API_ENDPOINTS.support.assign(ticketId),
    {
      assigned_to: assignedTo,
    },
  );

  return response.data;
}

export async function changeSupportTicketPriority(
  ticketId: number | string,
  priority: SupportTicketPriority,
) {
  const response = await apiClient.post<SupportTicket>(
    API_ENDPOINTS.support.priority(ticketId),
    {
      priority,
    },
  );

  return response.data;
}

export async function addSupportTicketTag(
  ticketId: number | string,
  tagId: number,
) {
  const response = await apiClient.post<SupportTicket>(
    API_ENDPOINTS.support.addTag(ticketId),
    {
      tag: tagId,
    },
  );

  return response.data;
}

export async function removeSupportTicketTag(
  ticketId: number | string,
  tagId: number,
) {
  const response = await apiClient.post<SupportTicket>(
    API_ENDPOINTS.support.removeTag(ticketId),
    {
      tag: tagId,
    },
  );

  return response.data;
}

export async function resolveSupportTicket(ticketId: number | string) {
  const response = await apiClient.post<SupportTicket>(
    API_ENDPOINTS.support.resolve(ticketId),
    {},
  );

  return response.data;
}

export async function closeSupportTicket(ticketId: number | string) {
  const response = await apiClient.post<SupportTicket>(
    API_ENDPOINTS.support.close(ticketId),
    {},
  );

  return response.data;
}

export async function reopenSupportTicket(ticketId: number | string) {
  const response = await apiClient.post<SupportTicket>(
    API_ENDPOINTS.support.reopen(ticketId),
    {},
  );

  return response.data;
}

export async function getSupportAuditLogs(ticketId: number | string) {
  const response = await apiClient.get<TicketAuditLog[]>(
    API_ENDPOINTS.support.auditLogs(ticketId),
  );

  return response.data;
}
