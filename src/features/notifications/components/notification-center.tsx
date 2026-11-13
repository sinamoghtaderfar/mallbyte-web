"use client";

import {
  CheckCheck,
  Mail,
  MailOpen,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearAllNotifications,
  clearReadNotifications,
  deleteSelectedNotifications,
  getNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  markSelectedNotificationsRead,
  markSelectedNotificationsUnread,
} from "@/features/notifications/api";
import { NotificationConfirmDialog } from "@/features/notifications/components/notification-confirm-dialog";
import { NotificationToast } from "@/features/notifications/components/notification-toast";
import { useNotificationStore } from "@/features/notifications/notification-store";
import type { Notification } from "@/features/notifications/types";

import { getSessionGeneration, isCurrentSession } from "@/lib/auth/session-storage";

type NotificationFilter = "all" | "unread" | "read";

type ConfirmAction =
  | "delete-selected"
  | "clear-read"
  | "clear-all";

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationCenter() {
  const router = useRouter();

  const refreshUnreadCount = useNotificationStore(
    (state) => state.refreshUnreadCount,
  );

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [filter, setFilter] =
    useState<NotificationFilter>("all");

  const [loadedFilter, setLoadedFilter] =
    useState<NotificationFilter | null>(null);

  const queryVersion = useRef(0);
  const mounted = useRef(false);
  const [isItemActionRunning, setIsItemActionRunning] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [retry, setRetry] = useState(0);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] =
    useState(false);

  const [selectedIds, setSelectedIds] =
    useState<Set<number>>(new Set());

  const [isMarkingAllRead, setIsMarkingAllRead] =
    useState(false);

  const [isBulkActionRunning, setIsBulkActionRunning] =
    useState(false);

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction | null>(null);

  const clearFeedback = useCallback(() => {
    setFeedback("");
  }, []);

  const isLoading = loadedFilter !== filter;

  useEffect(() => {
    let mounted = true;
    const query = ++queryVersion.current;
    const session = getSessionGeneration();
    const current = () =>
      mounted && query === queryVersion.current && isCurrentSession(session);

    async function loadNotifications() {
      try {
        const data = await getNotificationsPage(
          filter === "all"
            ? {}
            : {
                is_read: filter === "read",
              },
          1,
        );

        if (!current()) {
          return;
        }

        setNotifications(data.results);
        setPage(1);
        setHasMore(Boolean(data.next));
        setError("");
        setLoadedFilter(filter);
      } catch {
        if (!current()) {
          return;
        }

        setError("Could not load notifications.");
        setLoadedFilter(filter);
      }
    }

    void loadNotifications();

    return () => {
      mounted = false;
      queryVersion.current += 1;
    };
  }, [filter, retry]);

  const selectedCount = selectedIds.size;

  const allVisibleSelected =
    notifications.length > 0 &&
    notifications.every((notification) =>
      selectedIds.has(notification.id),
    );

  function handleFilterChange(
    nextFilter: NotificationFilter,
  ) {
    if (nextFilter === filter && !error) return;
    queryVersion.current += 1;
    setSelectedIds(new Set());
    setNotifications([]);
    setLoadedFilter(null);
    setIsLoadingMore(false);
    setError("");
    setPage(1);
    setHasMore(false);
    if (nextFilter === filter) setRetry((value) => value + 1);
    setFilter(nextFilter);
  }

  async function handleLoadMore() {
    if (
      !hasMore || isLoadingMore || isLoading ||
      isBulkActionRunning || isMarkingAllRead || isItemActionRunning
    ) {
      return;
    }

    const query = queryVersion.current;
    const session = getSessionGeneration();
    const current = () =>
      query === queryVersion.current && isCurrentSession(session);
    try {
      setIsLoadingMore(true);
      setError("");

      const nextPage = page + 1;

      const data = await getNotificationsPage(
        filter === "all"
          ? {}
          : {
              is_read: filter === "read",
            },
        nextPage,
      );

      if (!current()) return;
      setNotifications((items) => {
        const ids = new Set(items.map((item) => item.id));
        return [...items, ...data.results.filter((item) => !ids.has(item.id))];
      });

      setPage(nextPage);
      setHasMore(Boolean(data.next));
    } catch {
      if (current()) setError("Could not load more notifications.");
    } finally {
      if (current()) setIsLoadingMore(false);
    }
  }

  function retirePendingPages() {
    queryVersion.current += 1;
    setIsLoadingMore(false);
  }

  function refreshPages() {
    retirePendingPages();
    setNotifications([]);
    setLoadedFilter(null);
    setPage(1);
    setHasMore(false);
    setSelectedIds(new Set());
    setRetry((value) => value + 1);
  }

  function currentSession(session: number) {
    return mounted.current && isCurrentSession(session);
  }

  function handleSelectNotification(
    notificationId: number,
  ) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }

      return next;
    });
  }

  function handleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(
      new Set(
        notifications.map(
          (notification) => notification.id,
        ),
      ),
    );
  }

  async function handleOpen(notification: Notification) {
    if (isItemActionRunning || isBulkActionRunning || isMarkingAllRead) return;
    const session = getSessionGeneration();
    setIsItemActionRunning(true);
    retirePendingPages();
    const query = queryVersion.current;
    try {
      if (!notification.is_read) {
        await markNotificationRead(notification.id);
        if (!currentSession(session)) return;
        refreshPages();
        void refreshUnreadCount(true);
        setFeedback("Notification marked as read.");
      }
      if (currentSession(session) && notification.action_url.startsWith("/")) {
        router.push(notification.action_url);
      }
    } catch {
      if (currentSession(session) && query === queryVersion.current) {
        setError("Could not update notification.");
      }
    } finally {
      if (currentSession(session)) setIsItemActionRunning(false);
    }
  }

  async function handleToggleRead(notification: Notification) {
    if (isItemActionRunning || isBulkActionRunning || isMarkingAllRead) return;
    const session = getSessionGeneration();
    setIsItemActionRunning(true);
    retirePendingPages();
    const query = queryVersion.current;
    try {
      const updated = notification.is_read
        ? await markNotificationUnread(notification.id)
        : await markNotificationRead(notification.id);
      if (!currentSession(session)) return;
      refreshPages();
      await refreshUnreadCount(true);
      if (!currentSession(session)) return;
      setFeedback(updated.is_read
        ? "Notification marked as read." : "Notification marked as unread.");
    } catch {
      if (currentSession(session) && query === queryVersion.current) {
        setError("Could not update notification.");
      }
    } finally {
      if (currentSession(session)) setIsItemActionRunning(false);
    }
  }

  async function handleMarkAllRead() {
    if (isItemActionRunning || isBulkActionRunning || isMarkingAllRead) return;
    const session = getSessionGeneration();
    retirePendingPages();
    const query = queryVersion.current;
    try {
      setIsMarkingAllRead(true);
      setError("");

      await markAllNotificationsRead();
      if (!currentSession(session)) return;

      refreshPages();

      setSelectedIds(new Set());
      await refreshUnreadCount(true);
      if (!currentSession(session)) return;
      setFeedback("Notifications marked as read.");
    } catch {
      if (currentSession(session) && query === queryVersion.current) setError(
        "Could not mark all notifications as read.",
      );
    } finally {
      if (currentSession(session)) setIsMarkingAllRead(false);
    }
  }

  async function handleSelectedRead() {
    if (isItemActionRunning || isBulkActionRunning || isMarkingAllRead) return;
    const ids = Array.from(selectedIds);

    if (ids.length === 0) {
      return;
    }

    const session = getSessionGeneration();
    retirePendingPages();
    const query = queryVersion.current;
    try {
      setIsBulkActionRunning(true);
      setError("");

      await markSelectedNotificationsRead(
        ids,
      );
      if (!currentSession(session)) return;

      refreshPages();

      await refreshUnreadCount(true);
      if (!currentSession(session)) return;

      setSelectedIds(new Set());
      setFeedback("Selected notifications marked as read.");
    } catch {
      if (currentSession(session) && query === queryVersion.current) setError(
        "Could not mark selected notifications as read.",
      );
    } finally {
      if (currentSession(session)) setIsBulkActionRunning(false);
    }
  }

  async function handleSelectedUnread() {
    if (isItemActionRunning || isBulkActionRunning || isMarkingAllRead) return;
    const ids = Array.from(selectedIds);

    if (ids.length === 0) {
      return;
    }

    const session = getSessionGeneration();
    retirePendingPages();
    const query = queryVersion.current;
    try {
      setIsBulkActionRunning(true);
      setError("");

      await markSelectedNotificationsUnread(
        ids,
      );
      if (!currentSession(session)) return;

      refreshPages();

      await refreshUnreadCount(true);
      if (!currentSession(session)) return;

      setSelectedIds(new Set());
      setFeedback("Selected notifications marked as unread.");
    } catch {
      if (currentSession(session) && query === queryVersion.current) setError(
        "Could not mark selected notifications as unread.",
      );
    } finally {
      if (currentSession(session)) setIsBulkActionRunning(false);
    }
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) {
      return;
    }

    setConfirmAction("delete-selected");
  }

  function handleClearRead() {
    setConfirmAction("clear-read");
  }

  function handleClearAll() {
    setConfirmAction("clear-all");
  }

  async function executeDeleteSelected() {
    const ids = Array.from(selectedIds);

    if (ids.length === 0) {
      setConfirmAction(null);
      return;
    }

    const session = getSessionGeneration();
    retirePendingPages();
    const query = queryVersion.current;
    try {
      setIsBulkActionRunning(true);
      setError("");

      await deleteSelectedNotifications(ids);
      if (!currentSession(session)) return;

      refreshPages();

      setSelectedIds(new Set());
      setConfirmAction(null);

      await refreshUnreadCount(true);
      if (!currentSession(session)) return;

      setFeedback(
        "Selected notifications deleted.",
      );
    } catch {
      if (currentSession(session) && query === queryVersion.current) setError(
        "Could not delete selected notifications.",
      );
    } finally {
      if (currentSession(session)) setIsBulkActionRunning(false);
    }
  }

  async function executeClearRead() {
    const session = getSessionGeneration();
    retirePendingPages();
    const query = queryVersion.current;
    try {
      setIsBulkActionRunning(true);
      setError("");

      await clearReadNotifications();
      if (!currentSession(session)) return;

      refreshPages();

      setSelectedIds(new Set());
      setConfirmAction(null);

      await refreshUnreadCount(true);
      if (!currentSession(session)) return;

      setFeedback(
        "Read notifications cleared.",
      );
    } catch {
      if (currentSession(session) && query === queryVersion.current) setError(
        "Could not clear read notifications.",
      );
    } finally {
      if (currentSession(session)) setIsBulkActionRunning(false);
    }
  }

  async function executeClearAll() {
    const session = getSessionGeneration();
    retirePendingPages();
    const query = queryVersion.current;
    try {
      setIsBulkActionRunning(true);
      setError("");

      await clearAllNotifications();
      if (!currentSession(session)) return;

      refreshPages();
      setSelectedIds(new Set());
      await refreshUnreadCount(true);
      if (!currentSession(session)) return;
      setConfirmAction(null);

      setFeedback(
        "All notifications cleared.",
      );
    } catch {
      if (currentSession(session) && query === queryVersion.current) setError(
        "Could not clear notifications.",
      );
    } finally {
      if (currentSession(session)) setIsBulkActionRunning(false);
    }
  }

  return (
    <section>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Account
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Notifications
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Review updates about your
            orders, payments, shipments and
            returns.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void handleMarkAllRead()
          }
          disabled={
            isMarkingAllRead || isBulkActionRunning || isItemActionRunning || isLoading
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" />

          {isMarkingAllRead
            ? "Updating..."
            : "Mark all as read"}
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {(
            [
              "all",
              "unread",
              "read",
            ] as NotificationFilter[]
          ).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() =>
                handleFilterChange(item)
              }
              disabled={isBulkActionRunning || isMarkingAllRead}
              className={[
                "rounded-2xl px-4 py-2 text-sm font-medium capitalize transition",
                filter === item
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleClearRead}
            disabled={
              isBulkActionRunning || isMarkingAllRead || isItemActionRunning || isLoading
            }
            className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Clear read
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={
              isBulkActionRunning || isMarkingAllRead || isItemActionRunning || isLoading
            }
            className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Clear all
          </button>
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <span className="mr-2 text-sm font-semibold text-slate-700">
            {selectedCount} selected
          </span>

          <button
            type="button"
            onClick={() =>
              void handleSelectedRead()
            }
            disabled={
              isBulkActionRunning || isMarkingAllRead || isItemActionRunning || isLoading
            }
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
          >
            <MailOpen className="h-4 w-4" />
            Mark read
          </button>

          <button
            type="button"
            onClick={() =>
              void handleSelectedUnread()
            }
            disabled={
              isBulkActionRunning || isMarkingAllRead || isItemActionRunning || isLoading
            }
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            Mark unread
          </button>

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={
              isBulkActionRunning || isMarkingAllRead || isItemActionRunning || isLoading
            }
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => handleFilterChange(filter)}
            className="ml-3 font-semibold underline"
          >
            Retry notifications
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading notifications...
        </div>
      ) : null}

      {!isLoading &&
      !error &&
      notifications.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="font-semibold text-slate-950">
            No notifications
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            There are no notifications
            matching this filter.
          </p>
        </div>
      ) : null}

      {!isLoading &&
      !error &&
      notifications.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <input
              type="checkbox"
              aria-label="Select all notifications"
              checked={allVisibleSelected}
              onChange={handleSelectAll}
              className="h-4 w-4 rounded border-slate-300"
            />

            <span className="text-xs font-semibold text-slate-500">
              Select all
            </span>
          </div>

          {notifications.map(
            (notification) => (
              <div
                key={notification.id}
                className={[
                  "flex gap-4 border-b border-slate-100 p-5 last:border-b-0",
                  notification.is_read
                    ? "bg-white"
                    : "bg-blue-50/50",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${notification.title}`}
                  checked={selectedIds.has(
                    notification.id,
                  )}
                  onChange={() =>
                    handleSelectNotification(
                      notification.id,
                    )
                  }
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                />

                <span
                  className={[
                    "mt-2 h-2.5 w-2.5 shrink-0 rounded-full",
                    notification.is_read
                      ? "bg-slate-300"
                      : "bg-blue-600",
                  ].join(" ")}
                />

                <button
                  type="button"
                  onClick={() =>
                    void handleOpen(
                      notification,
                    )
                  }
                  disabled={isItemActionRunning || isBulkActionRunning || isMarkingAllRead}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-950">
                      {
                        notification.title
                      }
                    </h2>

                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium capitalize text-slate-500">
                      {
                        notification.notification_type
                      }
                    </span>

                    {notification.priority ===
                      "high" ||
                    notification.priority ===
                      "urgent" ? (
                      <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium capitalize text-red-600">
                        {
                          notification.priority
                        }
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {
                      notification.message
                    }
                  </p>

                  <p className="mt-3 text-xs text-slate-400">
                    {formatNotificationTime(
                      notification.created_at,
                    )}
                  </p>
                </button>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      void handleToggleRead(
                        notification,
                      )
                    }
                    disabled={isItemActionRunning || isBulkActionRunning || isMarkingAllRead}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    {notification.is_read
                      ? "Mark unread"
                      : "Mark read"}
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      ) : null}

      {!isLoading && hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void handleLoadMore()}
            disabled={isLoadingMore || isBulkActionRunning || isMarkingAllRead || isItemActionRunning}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {isLoadingMore
              ? "Loading..."
              : "Load more"}
          </button>
        </div>
      ) : null}

      <NotificationConfirmDialog
        open={confirmAction === "delete-selected"}
        title="Delete selected notifications?"
        description={`This will permanently delete ${selectedIds.size} selected notification${
          selectedIds.size === 1 ? "" : "s"
        }.`}
        confirmLabel="Delete"
        danger
        isBusy={isBulkActionRunning}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() =>
          void executeDeleteSelected()
        }
      />

      <NotificationConfirmDialog
        open={confirmAction === "clear-read"}
        title="Clear read notifications?"
        description="All notifications that are already read will be permanently deleted."
        confirmLabel="Clear read"
        danger
        isBusy={isBulkActionRunning}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() =>
          void executeClearRead()
        }
      />

      <NotificationConfirmDialog
        open={confirmAction === "clear-all"}
        title="Clear all notifications?"
        description="Every notification in your account will be permanently deleted. This cannot be undone."
        confirmLabel="Clear all"
        danger
        isBusy={isBulkActionRunning}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() =>
          void executeClearAll()
        }
      />

      <NotificationToast
        message={feedback}
        onClose={clearFeedback}
      />
    </section>
  );
}
