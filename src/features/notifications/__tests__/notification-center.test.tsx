import {
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  clearAllNotifications,
  clearReadNotifications,
  deleteSelectedNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  markSelectedNotificationsRead,
  markSelectedNotificationsUnread,
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
  clearAllNotifications: vi.fn(),
  clearReadNotifications: vi.fn(),
  deleteSelectedNotifications: vi.fn(),
  getNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  markNotificationUnread: vi.fn(),
  markSelectedNotificationsRead: vi.fn(),
  markSelectedNotificationsUnread: vi.fn(),
}));

const mockedGetNotifications = vi.mocked(getNotifications);
const mockedMarkAllRead = vi.mocked(markAllNotificationsRead);
const mockedMarkRead = vi.mocked(markNotificationRead);
const mockedMarkUnread = vi.mocked(markNotificationUnread);

const mockedMarkSelectedRead = vi.mocked(
  markSelectedNotificationsRead,
);

const mockedMarkSelectedUnread = vi.mocked(
  markSelectedNotificationsUnread,
);

const mockedDeleteSelected = vi.mocked(
  deleteSelectedNotifications,
);

const mockedClearRead = vi.mocked(
  clearReadNotifications,
);

const mockedClearAll = vi.mocked(
  clearAllNotifications,
);

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
        message: "Your payment was received.",
        notification_type: "payment",
        is_read: true,
        read_at: "2026-10-14T18:15:00Z",
        action_url: "/orders/13",
      }),
    ]);

    mockedMarkAllRead.mockResolvedValue(1);
    mockedMarkSelectedRead.mockResolvedValue(1);
    mockedMarkSelectedUnread.mockResolvedValue(1);
    mockedDeleteSelected.mockResolvedValue(1);
    mockedClearRead.mockResolvedValue(1);
    mockedClearAll.mockResolvedValue(2);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("toggles one notification to read", async () => {
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

  it("toggles one notification to unread", async () => {
    const user = userEvent.setup();

    mockedMarkUnread.mockResolvedValue(
      makeNotification({
        id: 2,
        title: "Payment received",
        is_read: false,
        read_at: null,
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

    const notification =
      await screen.findByRole("button", {
        name: /Shipment delivered/i,
      });

    await user.click(notification);

    expect(mockedMarkRead).toHaveBeenCalledWith(1);
    expect(pushMock).toHaveBeenCalledWith("/orders/12");
  });

  it("selects all visible notifications", async () => {
    const user = userEvent.setup();

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    await user.click(
      screen.getByRole("checkbox", {
        name: "Select all notifications",
      }),
    );

    expect(
      screen.getByText("2 selected"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("checkbox", {
        name: "Select Shipment delivered",
      }),
    ).toBeChecked();

    expect(
      screen.getByRole("checkbox", {
        name: "Select Payment received",
      }),
    ).toBeChecked();
  });

  it("marks selected notifications as read", async () => {
    const user = userEvent.setup();

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    await user.click(
      screen.getByRole("checkbox", {
        name: "Select Shipment delivered",
      }),
    );

    const toolbar = screen
      .getByText("1 selected")
      .closest("div");

    expect(toolbar).not.toBeNull();

    await user.click(
      within(toolbar as HTMLElement).getByRole("button", {
        name: "Mark read",
      }),
    );

    await waitFor(() => {
      expect(
        mockedMarkSelectedRead,
      ).toHaveBeenCalledWith([1]);
    });

    expect(
      screen.queryByText("1 selected"),
    ).not.toBeInTheDocument();
  });

  it("marks selected notifications as unread", async () => {
    const user = userEvent.setup();

    render(<NotificationCenter />);

    await screen.findByText("Payment received");

    await user.click(
      screen.getByRole("checkbox", {
        name: "Select Payment received",
      }),
    );

    const toolbar = screen
      .getByText("1 selected")
      .closest("div");

    expect(toolbar).not.toBeNull();

    await user.click(
      within(toolbar as HTMLElement).getByRole("button", {
        name: "Mark unread",
      }),
    );

    await waitFor(() => {
      expect(
        mockedMarkSelectedUnread,
      ).toHaveBeenCalledWith([2]);
    });
  });

  it("deletes selected notifications after confirmation", async () => {
    const user = userEvent.setup();

    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    await user.click(
      screen.getByRole("checkbox", {
        name: "Select Shipment delivered",
      }),
    );

    const toolbar = screen
      .getByText("1 selected")
      .closest("div");

    expect(toolbar).not.toBeNull();

    await user.click(
      within(toolbar as HTMLElement).getByRole("button", {
        name: "Delete",
      }),
    );

    await waitFor(() => {
      expect(
        mockedDeleteSelected,
      ).toHaveBeenCalledWith([1]);
    });

    expect(
      screen.queryByText("Shipment delivered"),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("Payment received"),
    ).toBeInTheDocument();
  });

  it("does not delete selected notifications when confirmation is cancelled", async () => {
    const user = userEvent.setup();

    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    await user.click(
      screen.getByRole("checkbox", {
        name: "Select Shipment delivered",
      }),
    );

    const toolbar = screen
      .getByText("1 selected")
      .closest("div");

    expect(toolbar).not.toBeNull();

    await user.click(
      within(toolbar as HTMLElement).getByRole("button", {
        name: "Delete",
      }),
    );

    expect(
      mockedDeleteSelected,
    ).not.toHaveBeenCalled();

    expect(
      screen.getByText("Shipment delivered"),
    ).toBeInTheDocument();
  });

  it("clears read notifications after confirmation", async () => {
    const user = userEvent.setup();

    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<NotificationCenter />);

    await screen.findByText("Payment received");

    await user.click(
      screen.getByRole("button", {
        name: "Clear read",
      }),
    );

    await waitFor(() => {
      expect(mockedClearRead).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.queryByText("Payment received"),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("Shipment delivered"),
    ).toBeInTheDocument();
  });

  it("clears all notifications after confirmation", async () => {
    const user = userEvent.setup();

    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    await user.click(
      screen.getByRole("button", {
        name: "Clear all",
      }),
    );

    await waitFor(() => {
      expect(mockedClearAll).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.queryByText("Shipment delivered"),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("Payment received"),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("No notifications"),
    ).toBeInTheDocument();
  });
});