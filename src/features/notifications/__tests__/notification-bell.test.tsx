import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
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
import { invalidateSession } from "@/lib/auth/session-storage";

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
    vi.resetAllMocks();
    pushMock.mockReset();

    useNotificationStore.getState().reset();

    let serverRows = [makeNotification(), makeNotification({
      id: 2, title: "Return approved", notification_type: "return", action_url: "/returns/5",
    })];
    mockedGetUnreadCount.mockImplementation(async () => serverRows.filter((row) => !row.is_read).length);
    mockedGetNotificationsPage.mockImplementation(async () => ({
      count: serverRows.length, next: null, previous: null, results: serverRows,
    }));
    mockedMarkAllRead.mockImplementation(async () => {
      serverRows = serverRows.map((row) => ({ ...row, is_read: true }));
      return 2;
    });
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

    mockedGetUnreadCount.mockResolvedValue(1);
    await user.click(notificationButton);

    expect(mockedMarkRead).toHaveBeenCalledWith(1);
    expect(pushMock).toHaveBeenCalledWith("/orders/12");

    expect(
      useNotificationStore.getState().unreadCount,
    ).toBe(1);
  });
  it("does not decrement the self count when a superadmin opens another user's notification", async () => {
    const user = userEvent.setup();
    const other = makeNotification({ id: 1, user: "other@example.com", title: "Another user's notification" });
    mockedGetUnreadCount.mockResolvedValue(2);
    mockedGetNotificationsPage.mockResolvedValue({ count: 3, next: null, previous: null,
      results: [other, makeNotification({ id: 2 }), makeNotification({ id: 3 })] });
    mockedMarkRead.mockResolvedValueOnce({ ...other, is_read: true });
    render(<NotificationBell />);
    await screen.findByText("2");
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    const link = await screen.findByRole("button", { name: /Another user's notification/ });
    mockedGetUnreadCount.mockClear();
    await user.click(link);
    await waitFor(() => expect(mockedGetUnreadCount).toHaveBeenCalledOnce());
    expect(useNotificationStore.getState().unreadCount).toBe(2);
    expect(pushMock).toHaveBeenCalledWith("/orders/12");
  });

  it("refetches the six-row preview after global read without marking other users' rows read", async () => {
    const user = userEvent.setup();
    const other = makeNotification({ id: 3, user: "other@example.com", title: "Other unread" });
    const own = [makeNotification(), makeNotification({ id: 2 })];
    mockedGetUnreadCount.mockResolvedValue(2);
    mockedMarkAllRead.mockImplementationOnce(async () => { mockedGetUnreadCount.mockResolvedValue(0); return 2; });
    mockedGetNotificationsPage.mockResolvedValueOnce({ count: 3, next: null, previous: null, results: [...own, other] })
      .mockResolvedValueOnce({ count: 3, next: null, previous: null, results: [...own.map((row) => ({ ...row, is_read: true })), other] });
    render(<NotificationBell />);
    await screen.findByText("2");
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    await screen.findByText("Other unread");
    mockedGetUnreadCount.mockClear();
    await user.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(await screen.findByText("0 unread")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Other unread/ })).toHaveClass("bg-blue-50/60");
    expect(mockedGetUnreadCount).toHaveBeenCalledOnce();
    expect(mockedGetNotificationsPage).toHaveBeenCalledTimes(2);
    expect(mockedGetNotificationsPage).toHaveBeenLastCalledWith({}, 1, 6);
  });

  it("retires an older pending preview when global read reloads the current page", async () => {
    const user = userEvent.setup();
    let resolveOld!: (page: Awaited<ReturnType<typeof getNotificationsPage>>) => void;
    mockedGetNotificationsPage.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ count: 21, next: "?page=2", previous: null,
        results: Array.from({ length: 6 }, (_, index) => makeNotification({ id: 10 + index, title: `Current preview ${index}`, is_read: true })) });
    render(<NotificationBell />);
    await screen.findByText("2");
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    await user.click(screen.getByRole("button", { name: "Mark all read" }));
    await screen.findByText("Current preview 0");
    await act(async () => resolveOld({ count: 21, next: "?page=2", previous: null,
      results: Array.from({ length: 6 }, (_, index) => makeNotification({ id: 1 + index, title: `Obsolete preview ${index}` })) }));
    expect(screen.queryByText("Obsolete preview 0")).not.toBeInTheDocument();
    expect(screen.getByText("Current preview 0")).toBeInTheDocument();
    expect(mockedGetNotificationsPage).toHaveBeenCalledTimes(2);
  });

  it("does not publish a preview or refresh the old user's count after session teardown", async () => {
    const user = userEvent.setup();
    let resolvePage!: (page: Awaited<ReturnType<typeof getNotificationsPage>>) => void;
    mockedGetNotificationsPage.mockReturnValueOnce(new Promise((resolve) => { resolvePage = resolve; }));
    render(<NotificationBell />);
    await screen.findByText("2");
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    mockedGetUnreadCount.mockClear();
    invalidateSession("logout");
    useNotificationStore.getState().reset();
    await act(async () => resolvePage({ count: 1, next: null, previous: null, results: [makeNotification({ title: "Private stale notification" })] }));
    expect(screen.queryByText("Private stale notification")).not.toBeInTheDocument();
    expect(mockedGetUnreadCount).not.toHaveBeenCalled();
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

});
