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
  getNotificationsPage,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  markSelectedNotificationsRead,
  markSelectedNotificationsUnread,
} from "@/features/notifications/api";
import type { Notification } from "@/features/notifications/types";

import { NotificationCenter } from "../components/notification-center";
import { useNotificationStore } from "../notification-store";

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
  getNotificationsPage: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  markNotificationUnread: vi.fn(),
  markSelectedNotificationsRead: vi.fn(),
  markSelectedNotificationsUnread: vi.fn(),
}));

const mockedGetNotificationsPage = vi.mocked(
  getNotificationsPage,
);
const mockedMarkAllRead = vi.mocked(markAllNotificationsRead);
const mockedMarkRead = vi.mocked(markNotificationRead);
const mockedMarkUnread = vi.mocked(markNotificationUnread);
const mockedGetUnreadCount = vi.mocked(
  getUnreadNotificationCount,
);
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

  useNotificationStore.setState({
    unreadCount: 1,
    isRefreshing: false,
  });

  mockedGetUnreadCount.mockResolvedValue(1);

    mockedGetNotificationsPage.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
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
      ],
    });

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

    expect(mockedGetNotificationsPage).toHaveBeenCalledWith(
      {},
      1,
    );
  });

  it("loads more notifications and appends the next page", async () => {
    const user = userEvent.setup();

    const first = makeNotification({
      id: 1,
      title: "First notification",
    });

    const second = makeNotification({
      id: 2,
      title: "Second notification",
      is_read: true,
      read_at: "2026-10-14T18:15:00Z",
    });

    mockedGetNotificationsPage
      .mockResolvedValueOnce({
        count: 2,
        next: "/api/notifications/?page=2",
        previous: null,
        results: [first],
      })
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        previous: "/api/notifications/",
        results: [second],
      });

    render(<NotificationCenter />);

    expect(
      await screen.findByText("First notification"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Load more",
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Load more",
      }),
    );

    expect(
      await screen.findByText("Second notification"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("First notification"),
    ).toBeInTheDocument();

    expect(
      mockedGetNotificationsPage,
    ).toHaveBeenNthCalledWith(
      2,
      {},
      2,
    );

    expect(
      screen.queryByRole("button", {
        name: "Load more",
      }),
    ).not.toBeInTheDocument();
  });

  it("loads unread notifications when unread filter is selected", async () => {
    const user = userEvent.setup();

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    mockedGetNotificationsPage.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [makeNotification()],
    });

    await user.click(
      screen.getByRole("button", {
        name: "unread",
      }),
    );

    expect(
      mockedGetNotificationsPage,
    ).toHaveBeenLastCalledWith(
      {
        is_read: false,
      },
      1,
    );
  });

  it("loads read notifications when read filter is selected", async () => {
    const user = userEvent.setup();

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    mockedGetNotificationsPage.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        makeNotification({
          id: 2,
          title: "Payment received",
          is_read: true,
        }),
      ],
    });

    await user.click(
      screen.getByRole("button", {
        name: "read",
      }),
    );

    expect(
      mockedGetNotificationsPage,
    ).toHaveBeenLastCalledWith(
      {
        is_read: true,
      },
      1,
    );
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

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(0);

    expect(
      screen.getByRole("status"),
    ).toHaveTextContent(
      "Notifications marked as read.",
    );
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

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(0);

    expect(
      screen.getByRole("status"),
    ).toHaveTextContent(
      "Notification marked as read.",
    );
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

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(2);

    expect(
      screen.getByRole("status"),
    ).toHaveTextContent(
      "Notification marked as unread.",
    );
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

    expect(
      screen.getByRole("status"),
    ).toHaveTextContent(
      "Selected notifications marked as read.",
    );
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

    expect(
      screen.getByRole("status"),
    ).toHaveTextContent(
      "Selected notifications marked as unread.",
    );
  });

  it("deletes selected notifications only after dialog confirmation", async () => {
    const user = userEvent.setup();

    mockedGetUnreadCount.mockResolvedValueOnce(0);

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

    const dialog = screen.getByRole("dialog");

    expect(
      within(dialog).getByText(
        "Delete selected notifications?",
      ),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", {
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

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(0);

    expect(
      screen.getByRole("status"),
    ).toHaveTextContent(
      "Selected notifications deleted.",
    );
  });

  it("does not delete selected notifications when dialog confirmation is cancelled", async () => {
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
        name: "Delete",
      }),
    );

    expect(
      mockedDeleteSelected,
    ).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");

    await user.click(
      within(dialog).getByRole("button", {
        name: "Cancel",
      }),
    );

    expect(
      screen.queryByRole("dialog"),
    ).not.toBeInTheDocument();

    expect(
      mockedDeleteSelected,
    ).not.toHaveBeenCalled();

    expect(
      screen.getByText("Shipment delivered"),
    ).toBeInTheDocument();
  });

  it("clears read notifications only after dialog confirmation", async () => {
    const user = userEvent.setup();

    render(<NotificationCenter />);

    await screen.findByText("Payment received");

    await user.click(
      screen.getByRole("button", {
        name: "Clear read",
      }),
    );

    expect(
      mockedClearRead,
    ).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");

    await user.click(
      within(dialog).getByRole("button", {
        name: "Clear read",
      }),
    );

    await waitFor(() => {
      expect(
        mockedClearRead,
      ).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.queryByText("Payment received"),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("Shipment delivered"),
    ).toBeInTheDocument();

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(1);

    expect(
      screen.getByRole("status"),
    ).toHaveTextContent(
      "Read notifications cleared.",
    );
  });

  it("clears all notifications only after dialog confirmation", async () => {
    const user = userEvent.setup();

    render(<NotificationCenter />);

    await screen.findByText("Shipment delivered");

    await user.click(
      screen.getByRole("button", {
        name: "Clear all",
      }),
    );

    expect(
      mockedClearAll,
    ).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");

    await user.click(
      within(dialog).getByRole("button", {
        name: "Clear all",
      }),
    );

    await waitFor(() => {
      expect(
        mockedClearAll,
      ).toHaveBeenCalledTimes(1);
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

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(0);

    expect(
      screen.getByRole("status"),
    ).toHaveTextContent(
      "All notifications cleared.",
    );
  });
});