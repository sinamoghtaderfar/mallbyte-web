import {
  act,
  fireEvent,
  render,
  screen,
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
  getNotificationsPage,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api";
import { useNotificationStore } from "@/features/notifications/notification-store";
import type { Notification } from "@/features/notifications/types";

import { NotificationBell } from "../components/notification-bell";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/features/notifications/api", () => ({
  getNotificationsPage: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
}));

const mockedGetNotificationsPage = vi.mocked(
  getNotificationsPage,
);
const mockedGetUnreadCount = vi.mocked(
  getUnreadNotificationCount,
);
const mockedMarkAllRead = vi.mocked(
  markAllNotificationsRead,
);
const mockedMarkRead = vi.mocked(
  markNotificationRead,
);

function makeNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: 1,
    user: "sina@example.com",
    title: "Shipment shipped",
    message: "Your shipment has been shipped.",
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

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockReset();

    useNotificationStore.setState({
      unreadCount: 0,
      isRefreshing: false,
    });

    mockedGetUnreadCount.mockResolvedValue(2);

    mockedGetNotificationsPage.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        makeNotification(),
        makeNotification({
          id: 2,
          title: "Return approved",
          notification_type: "return",
          action_url: "/returns/5",
        }),
      ],
    });

    mockedMarkAllRead.mockResolvedValue(2);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows unread count and loads the first notification page when opened", async () => {
    const user = userEvent.setup();

    render(<NotificationBell />);

    expect(await screen.findByText("2")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Notifications",
      }),
    );

    expect(
      await screen.findByText("Shipment shipped"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Return approved"),
    ).toBeInTheDocument();

    expect(
      mockedGetNotificationsPage,
    ).toHaveBeenCalledTimes(1);

    expect(
      mockedGetNotificationsPage,
    ).toHaveBeenCalledWith(
      {},
      1,
      6,
    );
  });

  it("refreshes unread count while polling when the tab is visible", async () => {
    vi.useFakeTimers();

    render(<NotificationBell />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      mockedGetUnreadCount,
    ).toHaveBeenCalledTimes(1);

    mockedGetUnreadCount.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000);
    });

    expect(
      mockedGetUnreadCount,
    ).toHaveBeenCalledTimes(1);
  });

  it("closes the notification panel on Escape", async () => {
    const user = userEvent.setup();

    render(<NotificationBell />);

    await user.click(
      screen.getByRole("button", {
        name: "Notifications",
      }),
    );

    expect(
      await screen.findByText("Shipment shipped"),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, {
      key: "Escape",
    });

    expect(
      screen.queryByText("Shipment shipped"),
    ).not.toBeInTheDocument();
  });

  it("closes the notification panel on outside click", async () => {
    const user = userEvent.setup();

    render(<NotificationBell />);

    await user.click(
      screen.getByRole("button", {
        name: "Notifications",
      }),
    );

    expect(
      await screen.findByText("Shipment shipped"),
    ).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(
      screen.queryByText("Shipment shipped"),
    ).not.toBeInTheDocument();
  });

  it("marks all notifications as read", async () => {
    const user = userEvent.setup();

    render(<NotificationBell />);

    await screen.findByText("2");

    await user.click(
      screen.getByRole("button", {
        name: "Notifications",
      }),
    );

    await screen.findByText("Shipment shipped");

    await user.click(
      screen.getByRole("button", {
        name: "Mark all read",
      }),
    );

    expect(mockedMarkAllRead).toHaveBeenCalledTimes(1);

    expect(
      screen.queryByText("2"),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("0 unread"),
    ).toBeInTheDocument();

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(0);
  });

  it("links to the full notifications page", async () => {
    const user = userEvent.setup();

    render(<NotificationBell />);

    await user.click(
      screen.getByRole("button", {
        name: "Notifications",
      }),
    );

    const link = await screen.findByRole("link", {
      name: "View all notifications",
    });

    expect(link).toHaveAttribute(
      "href",
      "/notifications",
    );
  });

  it("marks an unread notification as read and navigates to action url", async () => {
    const user = userEvent.setup();

    const updated = makeNotification({
      is_read: true,
      read_at: "2026-10-14T18:10:00Z",
    });

    mockedMarkRead.mockResolvedValue(updated);

    render(<NotificationBell />);

    await screen.findByText("2");

    await user.click(
      screen.getByRole("button", {
        name: "Notifications",
      }),
    );

    const notificationButton =
      await screen.findByRole(
        "button",
        {
          name: /Shipment shipped/i,
        },
      );

    await user.click(notificationButton);

    expect(mockedMarkRead).toHaveBeenCalledWith(1);
    expect(pushMock).toHaveBeenCalledWith("/orders/12");

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(1);
  });
});
