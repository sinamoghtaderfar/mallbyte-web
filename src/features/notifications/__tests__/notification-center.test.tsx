import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    markNotificationUnread,
} from "@/features/notifications/api";
import type { Notification } from "@/features/notifications/types";

import { NotificationCenter } from "../components/notification-center";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/features/notifications/api", () => ({
  getNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  markNotificationUnread: vi.fn(),
}));

const mockedGetNotifications = vi.mocked(getNotifications);
const mockedMarkAllRead = vi.mocked(markAllNotificationsRead);
const mockedMarkRead = vi.mocked(markNotificationRead);
const mockedMarkUnread = vi.mocked(markNotificationUnread);

function makeNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: 1,
    user: "sina@example.com",
    title: "Shipment delivered",
    message: "Your shipment was delivered.",
    notification_type: "shipping",
    channel: "in_app",
    priority: "normal",
    is_read: false,
    read_at: null,
    related_object_type: "order",
    related_object_id: "12",
    action_url: "/orders/12",
    metadata: {},
    created_at: "2026-10-14T18:00:00Z",
    updated_at: "2026-10-14T18:00:00Z",
    ...overrides,
  };
}

describe("NotificationCenter", () => {
  beforeEach(() => {
    pushMock.mockReset();

    mockedGetNotifications.mockResolvedValue([
      makeNotification(),
      makeNotification({
        id: 2,
        title: "Payment received",
        notification_type: "payment",
        is_read: true,
        read_at: "2026-10-14T18:15:00Z",
      }),
    ]);

    mockedMarkAllRead.mockResolvedValue(1);
  });

  it("loads notifications", async () => {
    render(<NotificationCenter />);

    expect(
      await screen.findByText("Shipment delivered"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Payment received"),
    ).toBeInTheDocument();

    expect(mockedGetNotifications).toHaveBeenCalledWith({});
  });

  it("loads unread notifications when unread filter is selected", async () => {
    const user = userEvent.setup();

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    mockedGetNotifications.mockResolvedValueOnce([
      makeNotification(),
    ]);

    await user.click(
      screen.getByRole("button", {
        name: "unread",
      }),
    );

    expect(mockedGetNotifications).toHaveBeenLastCalledWith({
      is_read: false,
    });
  });

  it("loads read notifications when read filter is selected", async () => {
    const user = userEvent.setup();

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    mockedGetNotifications.mockResolvedValueOnce([
      makeNotification({
        id: 2,
        title: "Payment received",
        is_read: true,
      }),
    ]);

    await user.click(
      screen.getByRole("button", {
        name: "read",
      }),
    );

    expect(mockedGetNotifications).toHaveBeenLastCalledWith({
      is_read: true,
    });
  });

  it("marks all notifications as read", async () => {
    const user = userEvent.setup();

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    await user.click(
      screen.getByRole("button", {
        name: "Mark all as read",
      }),
    );

    expect(mockedMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it("toggles a notification read state", async () => {
    const user = userEvent.setup();

    mockedMarkRead.mockResolvedValue(
      makeNotification({
        is_read: true,
        read_at: "2026-10-14T18:20:00Z",
      }),
    );

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    await user.click(
      screen.getByRole("button", {
        name: "Mark read",
      }),
    );

    expect(mockedMarkRead).toHaveBeenCalledWith(1);
  });

  it("can mark a read notification unread", async () => {
    const user = userEvent.setup();

    mockedMarkUnread.mockResolvedValue(
      makeNotification({
        id: 2,
        title: "Payment received",
        is_read: false,
      }),
    );

    render(<NotificationCenter />);

    await screen.findByText("Payment received");

    await user.click(
      screen.getByRole("button", {
        name: "Mark unread",
      }),
    );

    expect(mockedMarkUnread).toHaveBeenCalledWith(2);
  });

  it("opens the related page when a notification is clicked", async () => {
    const user = userEvent.setup();

    mockedMarkRead.mockResolvedValue(
      makeNotification({
        is_read: true,
      }),
    );

    render(<NotificationCenter />);

    const notification = await screen.findByRole(
      "button",
      {
        name: /Shipment delivered/i,
      },
    );

    await user.click(notification);

    expect(mockedMarkRead).toHaveBeenCalledWith(1);
    expect(pushMock).toHaveBeenCalledWith("/orders/12");
  });
});