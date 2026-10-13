import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import type {
    Notification,
    NotificationCountResponse,
    NotificationFilters,
    NotificationIdsPayload,
    NotificationPreferences,
    NotificationSummary,
    NotificationUnreadCount,
    UpdateNotificationPreferencesPayload,
} from "./types";

type PaginatedNotificationsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
};

export async function getNotifications(
  filters: NotificationFilters = {},
): Promise<Notification[]> {
  const all: Notification[] = [];
  const visited = new Set<string>();

  let next: string | null = API_ENDPOINTS.notifications.notifications;
  let isFirstRequest = true;

  while (next) {
    if (visited.has(next)) {
      throw new Error("Notifications pagination loop detected");
    }

    visited.add(next);

    const page: Notification[] | PaginatedNotificationsResponse = (
      await apiClient.get<
        Notification[] | PaginatedNotificationsResponse
      >(next, {
        params: isFirstRequest
          ? {
              ...filters,
              is_read:
                typeof filters.is_read === "boolean"
                  ? String(filters.is_read)
                  : undefined,
            }
          : undefined,
      })
    ).data;

    isFirstRequest = false;

    if (Array.isArray(page)) {
      all.push(...page);
      break;
    }

    all.push(...page.results);
    next = page.next;
  }

  return all;
}

export async function getNotification(
  notificationId: number | string,
): Promise<Notification> {
  const response = await apiClient.get<Notification>(
    API_ENDPOINTS.notifications.detail(notificationId),
  );

  return response.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient.get<NotificationUnreadCount>(
    API_ENDPOINTS.notifications.unreadCount,
  );

  return response.data.unread_count;
}

export async function getNotificationSummary(): Promise<NotificationSummary> {
  const response = await apiClient.get<NotificationSummary>(
    API_ENDPOINTS.notifications.summary,
  );

  return response.data;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await apiClient.get<NotificationPreferences>(
    API_ENDPOINTS.notifications.preferences,
  );

  return response.data;
}

export async function updateNotificationPreferences(
  payload: UpdateNotificationPreferencesPayload,
): Promise<NotificationPreferences> {
  const response = await apiClient.post<NotificationPreferences>(
    API_ENDPOINTS.notifications.preferences,
    payload,
  );

  return response.data;
}

export async function markNotificationRead(
  notificationId: number | string,
): Promise<Notification> {
  const response = await apiClient.post<Notification>(
    API_ENDPOINTS.notifications.markRead(notificationId),
    {},
  );

  return response.data;
}

export async function markNotificationUnread(
  notificationId: number | string,
): Promise<Notification> {
  const response = await apiClient.post<Notification>(
    API_ENDPOINTS.notifications.markUnread(notificationId),
    {},
  );

  return response.data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await apiClient.post<NotificationCountResponse>(
    API_ENDPOINTS.notifications.markAllRead,
    {},
  );

  return response.data.marked_count ?? 0;
}

export async function markSelectedNotificationsRead(
  ids: number[],
): Promise<number> {
  const payload: NotificationIdsPayload = {
    ids,
  };

  const response = await apiClient.post<NotificationCountResponse>(
    API_ENDPOINTS.notifications.markSelectedRead,
    payload,
  );

  return response.data.marked_count ?? 0;
}

export async function markSelectedNotificationsUnread(
  ids: number[],
): Promise<number> {
  const payload: NotificationIdsPayload = {
    ids,
  };

  const response = await apiClient.post<NotificationCountResponse>(
    API_ENDPOINTS.notifications.markSelectedUnread,
    payload,
  );

  return response.data.marked_count ?? 0;
}

export async function deleteSelectedNotifications(
  ids: number[],
): Promise<number> {
  const payload: NotificationIdsPayload = {
    ids,
  };

  const response = await apiClient.post<NotificationCountResponse>(
    API_ENDPOINTS.notifications.deleteSelected,
    payload,
  );

  return response.data.deleted_count ?? 0;
}

export async function clearReadNotifications(): Promise<number> {
  const response = await apiClient.delete<NotificationCountResponse>(
    API_ENDPOINTS.notifications.clearRead,
  );

  return response.data.deleted_count ?? 0;
}

export async function clearAllNotifications(): Promise<number> {
  const response = await apiClient.delete<NotificationCountResponse>(
    API_ENDPOINTS.notifications.clearAll,
  );

  return response.data.deleted_count ?? 0;
}