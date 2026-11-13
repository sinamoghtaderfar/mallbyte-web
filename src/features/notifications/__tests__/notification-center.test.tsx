import {
  act,
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("NotificationCenter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    pushMock.mockReset();

  useNotificationStore.setState({
    unreadCount: 1,
    isRefreshing: false,
  });

  mockedGetUnreadCount.mockResolvedValue(1);

    // Model the server after mutations: refetches must not return pre-action rows.
    let serverRows = [makeNotification(), makeNotification({
      id: 2, title: "Payment received", message: "Your payment was received.",
      notification_type: "payment", is_read: true,
      read_at: "2026-10-14T18:15:00Z", action_url: "/orders/13",
    })];
    mockedGetNotificationsPage.mockImplementation(async (filters = {}) => {
      const results = serverRows.filter((row) =>
        filters.is_read === undefined || row.is_read === filters.is_read);
      return { count: results.length, next: null, previous: null, results };
    });
    mockedGetUnreadCount.mockImplementation(async () => serverRows.filter((row) => !row.is_read).length);
    mockedMarkAllRead.mockImplementation(async () => {
      serverRows = serverRows.map((row) => ({ ...row, is_read: true }));
      return 1;
    });
    mockedMarkSelectedRead.mockImplementation(async (ids) => {
      serverRows = serverRows.map((row) => ids.includes(row.id) ? { ...row, is_read: true } : row);
      return 1;
    });
    mockedMarkSelectedUnread.mockImplementation(async (ids) => {
      serverRows = serverRows.map((row) => ids.includes(row.id) ? { ...row, is_read: false } : row);
      return 1;
    });
    mockedDeleteSelected.mockImplementation(async (ids) => {
      serverRows = serverRows.filter((row) => !ids.includes(row.id));
      return 1;
    });
    mockedClearRead.mockImplementation(async () => {
      serverRows = serverRows.filter((row) => !row.is_read);
      return 1;
    });
    mockedClearAll.mockImplementation(async () => { serverRows = []; return 2; });
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
    mockedGetUnreadCount.mockResolvedValueOnce(0);

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
    mockedGetUnreadCount.mockResolvedValueOnce(2);

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
  it("retires a 21-record query's pending page and loading state when filters change", async () => {
    const user = userEvent.setup();
    const oldPage =
      deferred<Awaited<ReturnType<typeof getNotificationsPage>>>();
    const newPage =
      deferred<Awaited<ReturnType<typeof getNotificationsPage>>>();
    const first = Array.from({ length: 20 }, (_, index) =>
      makeNotification({ id: index + 1, title: `Old ${index + 1}` }),
    );
    mockedGetNotificationsPage
      .mockResolvedValueOnce({
        count: 21,
        next: "?page=2",
        previous: null,
        results: first,
      })
      .mockReturnValueOnce(oldPage.promise)
      .mockResolvedValueOnce({
        count: 21,
        next: "?is_read=true&page=2",
        previous: null,
        results: [
          makeNotification({ id: 50, title: "Current read", is_read: true }),
        ],
      })
      .mockReturnValueOnce(newPage.promise);
    render(<NotificationCenter />);
    await screen.findByText("Old 1");
    await user.click(screen.getByRole("button", { name: "Load more" }));
    await user.click(screen.getByRole("button", { name: "read" }));
    await screen.findByText("Current read");
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(mockedGetNotificationsPage).toHaveBeenLastCalledWith(
      { is_read: true },
      2,
    );
    await act(async () =>
      oldPage.resolve({
        count: 21,
        next: null,
        previous: "?page=1",
        results: [makeNotification({ id: 21, title: "Obsolete unread" })],
      }),
    );
    expect(screen.queryByText("Obsolete unread")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
    await act(async () =>
      newPage.resolve({
        count: 21,
        next: null,
        previous: "?is_read=true&page=1",
        results: [
          makeNotification({
            id: 51,
            title: "Current page two",
            is_read: true,
          }),
        ],
      }),
    );
    expect(screen.getByText("Current page two")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });

  it("ignores errors from load-more requests belonging to an obsolete filter", async () => {
    const user = userEvent.setup();
    const oldPage =
      deferred<Awaited<ReturnType<typeof getNotificationsPage>>>();
    mockedGetNotificationsPage
      .mockResolvedValueOnce({
        count: 21,
        next: "?page=2",
        previous: null,
        results: [makeNotification()],
      })
      .mockReturnValueOnce(oldPage.promise)
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          makeNotification({ id: 50, title: "Read result", is_read: true }),
        ],
      });
    render(<NotificationCenter />);
    await screen.findByText("Shipment delivered");
    await user.click(screen.getByRole("button", { name: "Load more" }));
    await user.click(screen.getByRole("button", { name: "read" }));
    await screen.findByText("Read result");
    await act(async () => oldPage.reject(new Error("Old page failed")));
    expect(screen.getByText("Read result")).toBeInTheDocument();
    expect(
      screen.queryByText("Could not load more notifications."),
    ).not.toBeInTheDocument();
  });

  it("keeps the global mark-all action available when unread records are only on a later page", async () => {
    const user = userEvent.setup();
    mockedGetNotificationsPage.mockResolvedValueOnce({
      count: 21,
      next: "?page=2",
      previous: null,
      results: Array.from({ length: 20 }, (_, index) =>
        makeNotification({
          id: index + 1,
          title: `Read ${index + 1}`,
          is_read: true,
        }),
      ),
    });
    useNotificationStore.getState().setUnreadCount(1);
    render(<NotificationCenter />);
    await screen.findByText("Read 1");
    const action = screen.getByRole("button", { name: "Mark all as read" });
    expect(action).toBeEnabled();
    await user.click(action);
    expect(mockedMarkAllRead).toHaveBeenCalledOnce();
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it("retries a failed current filter without showing rows from the previous filter", async () => {
    const user = userEvent.setup();
    render(<NotificationCenter />);
    await screen.findByText("Shipment delivered");
    mockedGetNotificationsPage.mockRejectedValueOnce(new Error("Offline"));
    await user.click(screen.getByRole("button", { name: "read" }));
    await screen.findByText("Could not load notifications.");
    expect(screen.queryByText("Shipment delivered")).not.toBeInTheDocument();
    mockedGetNotificationsPage.mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [makeNotification({ id: 5, title: "Recovered read", is_read: true })] });
    await user.click(screen.getByRole("button", { name: "Retry notifications" }));
    expect(await screen.findByText("Recovered read")).toBeInTheDocument();
    expect(mockedGetNotificationsPage).toHaveBeenLastCalledWith({ is_read: true }, 1);
  });

  it("reloads authoritative page one after global read and retires an older pending page", async () => {
    const user = userEvent.setup();
    const stale = deferred<Awaited<ReturnType<typeof getNotificationsPage>>>();
    mockedGetNotificationsPage.mockResolvedValueOnce({ count: 21, next: "?page=2", previous: null, results: [makeNotification()] })
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce({ count: 21, next: "?page=2", previous: null, results: [makeNotification({ is_read: true }), makeNotification({ id: 40, title: "Other visible user's unread", is_read: false })] });
    render(<NotificationCenter />);
    await screen.findByText("Shipment delivered");
    await user.click(screen.getByRole("button", { name: "Load more" }));
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    await screen.findByText("Other visible user's unread");
    expect(mockedGetNotificationsPage).toHaveBeenLastCalledWith({}, 1);
    await act(async () => stale.resolve({ count: 21, next: null, previous: "?page=1", results: [makeNotification({ id: 21, title: "Stale unread page" })] }));
    expect(screen.queryByText("Stale unread page")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load more" })).toBeEnabled();
  });

  it.each(["delete", "clear-read", "selected-read", "clear-all"] as const)(
    "retires a pending page before a %s mutation completes and reloads bounded page one",
    async (action) => {
      const user = userEvent.setup();
      const oldPage = deferred<Awaited<ReturnType<typeof getNotificationsPage>>>();
      const mutation = deferred<number>();
      mockedGetNotificationsPage
        .mockResolvedValueOnce({ count: 21, next: "?page=2", previous: null,
          results: Array.from({ length: 20 }, (_, index) => makeNotification({
            id: index + 1, title: `Before ${index + 1}`, is_read: index > 0,
          })),
        })
        .mockReturnValueOnce(oldPage.promise)
        .mockResolvedValueOnce({ count: action === "clear-all" ? 0 : 1,
          next: null, previous: null,
          results: action === "clear-all" ? [] : [makeNotification({ id: 100, title: "Authoritative page one" })],
        });
      if (action === "delete") mockedDeleteSelected.mockReturnValueOnce(mutation.promise);
      if (action === "clear-read") mockedClearRead.mockReturnValueOnce(mutation.promise);
      if (action === "selected-read") mockedMarkSelectedRead.mockReturnValueOnce(mutation.promise);
      if (action === "clear-all") mockedClearAll.mockReturnValueOnce(mutation.promise);
      render(<NotificationCenter />);
      await screen.findByText("Before 1");
      await user.click(screen.getByRole("button", { name: "Load more" }));
      if (action === "delete" || action === "selected-read") {
        await user.click(screen.getByRole("checkbox", { name: "Select Before 1" }));
        const toolbar = screen.getByText("1 selected").closest("div")!;
        await user.click(within(toolbar).getByRole("button", { name: action === "delete" ? "Delete" : "Mark read" }));
        if (action === "delete") await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
      } else {
        await user.click(screen.getByRole("button", { name: action === "clear-all" ? "Clear all" : "Clear read" }));
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: action === "clear-all" ? "Clear all" : "Clear read" }));
      }
      await act(async () => oldPage.resolve({ count: 21, next: null, previous: "?page=1",
        results: [makeNotification({ id: 21, title: "Obsolete mutation page" })] }));
      expect(screen.queryByText("Obsolete mutation page")).not.toBeInTheDocument();
      await act(async () => mutation.resolve(1));
      if (action === "clear-all") expect(await screen.findByText("No notifications")).toBeInTheDocument();
      else expect(await screen.findByText("Authoritative page one")).toBeInTheDocument();
      expect(mockedGetNotificationsPage).toHaveBeenLastCalledWith({}, 1);
      expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    },
  );

  it("refreshes the current filter after an older single-row mutation completes", async () => {
    const user = userEvent.setup();
    const mutation = deferred<Notification>();
    mockedMarkRead.mockReturnValueOnce(mutation.promise);
    mockedGetNotificationsPage
      .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [makeNotification()] })
      .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [makeNotification({ id: 50, title: "Current read row", is_read: true })] })
      .mockResolvedValueOnce({ count: 2, next: null, previous: null, results: [
        makeNotification({ is_read: true }), makeNotification({ id: 50, title: "Current read row", is_read: true }),
      ] });
    render(<NotificationCenter />);
    await screen.findByText("Shipment delivered");
    await user.click(screen.getByRole("button", { name: "Mark read" }));
    await user.click(screen.getByRole("button", { name: "read" }));
    await screen.findByText("Current read row");
    await act(async () => mutation.resolve(makeNotification({ is_read: true })));
    expect(await screen.findByText("Shipment delivered")).toBeInTheDocument();
    expect(screen.getByText("Current read row")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark read" })).not.toBeInTheDocument();
    expect(mockedGetNotificationsPage).toHaveBeenLastCalledWith({ is_read: true }, 1);
  });

  it("refreshes the self-scoped unread count when a superadmin changes another user's row", async () => {
    const user = userEvent.setup();
    const other = makeNotification({ user: "another@example.com", title: "Another user's notification" });
    mockedGetNotificationsPage.mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [other] })
      .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [{ ...other, is_read: true }] });
    mockedMarkRead.mockResolvedValueOnce({ ...other, is_read: true });
    mockedGetUnreadCount.mockResolvedValueOnce(2);
    useNotificationStore.getState().setUnreadCount(2);
    render(<NotificationCenter />);
    await screen.findByText("Another user's notification");
    await user.click(screen.getByRole("button", { name: "Mark read" }));
    await waitFor(() => expect(mockedGetUnreadCount).toHaveBeenCalledOnce());
    expect(useNotificationStore.getState().unreadCount).toBe(2);
    expect(mockedGetNotificationsPage).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Mark unread" })).toBeInTheDocument();
  });

  it("does not delay navigation while the optional unread-count refresh is pending", async () => {
    const user = userEvent.setup();
    const count = deferred<number>();
    mockedMarkRead.mockResolvedValueOnce(makeNotification({ is_read: true }));
    mockedGetUnreadCount.mockReturnValueOnce(count.promise);
    render(<NotificationCenter />);
    await user.click(await screen.findByRole("button", { name: /Shipment delivered/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/orders/12"));
    expect(mockedGetUnreadCount).toHaveBeenCalledOnce();
    await act(async () => count.resolve(0));
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

});
