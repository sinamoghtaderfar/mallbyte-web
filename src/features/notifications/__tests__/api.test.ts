import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import {
    clearAllNotifications,
    clearReadNotifications,
    deleteSelectedNotifications,
    getNotificationPreferences,
    getNotifications,
    getNotificationSummary,
    getUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
    markNotificationUnread,
    markSelectedNotificationsRead,
    markSelectedNotificationsUnread,
    updateNotificationPreferences,
} from "../api";

import type {
    Notification,
    NotificationPreferences,
} from "../types";

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedDelete = vi.mocked(apiClient.delete);

function makeNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: 1,
    user: "sina@example.com",
    title: "Order shipped",
    message: "Your order has been shipped.",
    notification_type: "shipping",
    channel: "in_app",
    priority: "normal",
    is_read: false,
    read_at: null,
    related_object_type: "order",
    related_object_id: "12",
    action_url: "/orders/12",
    metadata: {},
    created_at: "2026-10-13T18:00:00Z",
    updated_at: "2026-10-13T18:00:00Z",
    ...overrides,
  };
}

describe("notifications api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns plain notification arrays", async () => {
    const notifications = [makeNotification()];

    mockedGet.mockResolvedValue({
      data: notifications,
    });

    await expect(getNotifications()).resolves.toEqual(notifications);

    expect(mockedGet).toHaveBeenCalledWith(
      API_ENDPOINTS.notifications.notifications,
      {
        params: {
          is_read: undefined,
        },
      },
    );
  });

  it("follows paginated notification responses", async () => {
    const first = makeNotification({ id: 1 });
    const second = makeNotification({ id: 2 });

    mockedGet
      .mockResolvedValueOnce({
        data: {
          count: 2,
          next: "/api/notifications/?page=2",
          previous: null,
          results: [first],
        },
      })
      .mockResolvedValueOnce({
        data: {
          count: 2,
          next: null,
          previous: "/api/notifications/",
          results: [second],
        },
      });

    await expect(getNotifications()).resolves.toEqual([
      first,
      second,
    ]);

    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("passes unread filters to the API", async () => {
    mockedGet.mockResolvedValue({
      data: [],
    });

    await getNotifications({
      is_read: false,
      notification_type: "order",
    });

    expect(mockedGet).toHaveBeenCalledWith(
      API_ENDPOINTS.notifications.notifications,
      {
        params: {
          is_read: "false",
          notification_type: "order",
        },
      },
    );
  });

  it("gets unread count", async () => {
    mockedGet.mockResolvedValue({
      data: {
        unread_count: 4,
      },
    });

    await expect(
      getUnreadNotificationCount(),
    ).resolves.toBe(4);
  });

  it("gets notification summary", async () => {
    const summary = {
      total_count: 10,
      unread_count: 4,
      read_count: 6,
      by_type: {
        order: 4,
        shipping: 3,
      },
      by_priority: {
        normal: 9,
        high: 1,
      },
    };

    mockedGet.mockResolvedValue({
      data: summary,
    });

    await expect(
      getNotificationSummary(),
    ).resolves.toEqual(summary);
  });

  it("marks one notification read", async () => {
    const notification = makeNotification({
      is_read: true,
      read_at: "2026-10-13T19:00:00Z",
    });

    mockedPost.mockResolvedValue({
      data: notification,
    });

    await expect(
      markNotificationRead(1),
    ).resolves.toEqual(notification);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.notifications.markRead(1),
      {},
    );
  });

  it("marks one notification unread", async () => {
    const notification = makeNotification();

    mockedPost.mockResolvedValue({
      data: notification,
    });

    await expect(
      markNotificationUnread(1),
    ).resolves.toEqual(notification);
  });

  it("marks all notifications read", async () => {
    mockedPost.mockResolvedValue({
      data: {
        marked_count: 5,
      },
    });

    await expect(
      markAllNotificationsRead(),
    ).resolves.toBe(5);
  });

  it("supports selected notification actions", async () => {
    mockedPost
      .mockResolvedValueOnce({
        data: { marked_count: 2 },
      })
      .mockResolvedValueOnce({
        data: { marked_count: 2 },
      })
      .mockResolvedValueOnce({
        data: { deleted_count: 2 },
      });

    await expect(
      markSelectedNotificationsRead([1, 2]),
    ).resolves.toBe(2);

    await expect(
      markSelectedNotificationsUnread([1, 2]),
    ).resolves.toBe(2);

    await expect(
      deleteSelectedNotifications([1, 2]),
    ).resolves.toBe(2);
  });

  it("gets and updates notification preferences", async () => {
    const preferences: NotificationPreferences = {
      id: 1,
      user: "sina@example.com",
      muted_notification_types: [],
      muted_channels: [],
      email_enabled: true,
      sms_enabled: false,
      push_enabled: false,
      in_app_enabled: true,
      created_at: "2026-10-13T18:00:00Z",
      updated_at: "2026-10-13T18:00:00Z",
    };

    mockedGet.mockResolvedValue({
      data: preferences,
    });

    await expect(
      getNotificationPreferences(),
    ).resolves.toEqual(preferences);

    mockedPost.mockResolvedValue({
      data: {
        ...preferences,
        email_enabled: false,
      },
    });

    await updateNotificationPreferences({
      email_enabled: false,
    });

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.notifications.preferences,
      {
        email_enabled: false,
      },
    );
  });

  it("clears read and all notifications", async () => {
    mockedDelete
      .mockResolvedValueOnce({
        data: { deleted_count: 3 },
      })
      .mockResolvedValueOnce({
        data: { deleted_count: 5 },
      });

    await expect(
      clearReadNotifications(),
    ).resolves.toBe(3);

    await expect(
      clearAllNotifications(),
    ).resolves.toBe(5);
  });
});