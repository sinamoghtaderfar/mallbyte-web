"use client";

import {
  CheckCheck,
  Mail,
  MailOpen,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

  const decrementUnreadCount = useNotificationStore(
    (state) => state.decrementUnreadCount,
  );

  const incrementUnreadCount = useNotificationStore(
    (state) => state.incrementUnreadCount,
  );

  const setUnreadCount = useNotificationStore(
    (state) => state.setUnreadCount,
  );

  const refreshUnreadCount = useNotificationStore(
    (state) => state.refreshUnreadCount,
  );

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [filter, setFilter] =
    useState<NotificationFilter>("all");

  const [loadedFilter, setLoadedFilter] =
    useState<NotificationFilter | null>(null);

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

        if (!mounted) {
          return;
        }

        setNotifications(data.results);
        setPage(1);
        setHasMore(Boolean(data.next));
        setError("");
        setLoadedFilter(filter);
      } catch {
        if (!mounted) {
          return;
        }

        setError("Could not load notifications.");
        setLoadedFilter(filter);
      }
    }

    void loadNotifications();

    return () => {
      mounted = false;
    };
  }, [filter]);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;

  const selectedCount = selectedIds.size;

  const allVisibleSelected =
    notifications.length > 0 &&
    notifications.every((notification) =>
      selectedIds.has(notification.id),
    );

  function handleFilterChange(
    nextFilter: NotificationFilter,
  ) {
    setSelectedIds(new Set());
    setPage(1);
    setHasMore(false);
    setFilter(nextFilter);
  }

  async function handleLoadMore() {
    if (!hasMore || isLoadingMore) {
      return;
    }

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

      setNotifications((current) => [
        ...current,
        ...data.results,
      ]);

      setPage(nextPage);
      setHasMore(Boolean(data.next));
    } catch {
      setError(
        "Could not load more notifications.",
      );
    } finally {
      setIsLoadingMore(false);
    }
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

  async function handleOpen(
    notification: Notification,
  ) {
    try {
      if (!notification.is_read) {
        const updated =
          await markNotificationRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item,
          ),
        );

        decrementUnreadCount();
        setFeedback("Notification marked as read.");
      }

      if (
        notification.action_url.startsWith("/")
      ) {
        router.push(notification.action_url);
      }
    } catch {
      setError(
        "Could not update notification.",
      );
    }
  }

  async function handleToggleRead(
    notification: Notification,
  ) {
    try {
      const updated = notification.is_read
        ? await markNotificationUnread(
            notification.id,
          )
        : await markNotificationRead(
            notification.id,
          );

      if (
        notification.is_read &&
        !updated.is_read
      ) {
        incrementUnreadCount();
      }

      if (
        !notification.is_read &&
        updated.is_read
      ) {
        decrementUnreadCount();
      }

      setNotifications((current) => {
        if (
          filter === "unread" &&
          updated.is_read
        ) {
          return current.filter(
            (item) =>
              item.id !== updated.id,
          );
        }

        if (
          filter === "read" &&
          !updated.is_read
        ) {
          return current.filter(
            (item) =>
              item.id !== updated.id,
          );
        }

        return current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        );
      });

      setFeedback(
        updated.is_read
          ? "Notification marked as read."
          : "Notification marked as unread.",
      );
    } catch {
      setError(
        "Could not update notification.",
      );
    }
  }

  async function handleMarkAllRead() {
    try {
      setIsMarkingAllRead(true);
      setError("");

      await markAllNotificationsRead();

      if (filter === "unread") {
        setNotifications([]);
      } else {
        setNotifications((current) =>
          current.map(
            (notification) => ({
              ...notification,
              is_read: true,
              read_at:
                notification.read_at ??
                new Date().toISOString(),
            }),
          ),
        );
      }

      setSelectedIds(new Set());
      setUnreadCount(0);
      setFeedback("Notifications marked as read.");
    } catch {
      setError(
        "Could not mark all notifications as read.",
      );
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  async function handleSelectedRead() {
    const ids = Array.from(selectedIds);

    if (ids.length === 0) {
      return;
    }

    const selectedUnreadCount =
      notifications.filter(
        (notification) =>
          selectedIds.has(
            notification.id,
          ) &&
          !notification.is_read,
      ).length;

    try {
      setIsBulkActionRunning(true);
      setError("");

      await markSelectedNotificationsRead(
        ids,
      );

      setNotifications((current) => {
        if (filter === "unread") {
          return current.filter(
            (notification) =>
              !selectedIds.has(
                notification.id,
              ),
          );
        }

        return current.map(
          (notification) =>
            selectedIds.has(
              notification.id,
            )
              ? {
                  ...notification,
                  is_read: true,
                  read_at:
                    notification.read_at ??
                    new Date().toISOString(),
                }
              : notification,
        );
      });

      if (selectedUnreadCount > 0) {
        decrementUnreadCount(
          selectedUnreadCount,
        );
      }

      setSelectedIds(new Set());
      setFeedback("Selected notifications marked as read.");
    } catch {
      setError(
        "Could not mark selected notifications as read.",
      );
    } finally {
      setIsBulkActionRunning(false);
    }
  }

  async function handleSelectedUnread() {
    const ids = Array.from(selectedIds);

    if (ids.length === 0) {
      return;
    }

    const selectedReadCount =
      notifications.filter(
        (notification) =>
          selectedIds.has(
            notification.id,
          ) &&
          notification.is_read,
      ).length;

    try {
      setIsBulkActionRunning(true);
      setError("");

      await markSelectedNotificationsUnread(
        ids,
      );

      setNotifications((current) => {
        if (filter === "read") {
          return current.filter(
            (notification) =>
              !selectedIds.has(
                notification.id,
              ),
          );
        }

        return current.map(
          (notification) =>
            selectedIds.has(
              notification.id,
            )
              ? {
                  ...notification,
                  is_read: false,
                  read_at: null,
                }
              : notification,
        );
      });

      if (selectedReadCount > 0) {
        incrementUnreadCount(
          selectedReadCount,
        );
      }

      setSelectedIds(new Set());
      setFeedback("Selected notifications marked as unread.");
    } catch {
      setError(
        "Could not mark selected notifications as unread.",
      );
    } finally {
      setIsBulkActionRunning(false);
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

    try {
      setIsBulkActionRunning(true);
      setError("");

      await deleteSelectedNotifications(ids);

      setNotifications((current) =>
        current.filter(
          (notification) =>
            !selectedIds.has(
              notification.id,
            ),
        ),
      );

      setSelectedIds(new Set());
      setConfirmAction(null);

      await refreshUnreadCount();

      setFeedback(
        "Selected notifications deleted.",
      );
    } catch {
      setError(
        "Could not delete selected notifications.",
      );
    } finally {
      setIsBulkActionRunning(false);
    }
  }

  async function executeClearRead() {
    try {
      setIsBulkActionRunning(true);
      setError("");

      await clearReadNotifications();

      setNotifications((current) =>
        current.filter(
          (notification) =>
            !notification.is_read,
        ),
      );

      setSelectedIds(new Set());
      setConfirmAction(null);

      await refreshUnreadCount();

      setFeedback(
        "Read notifications cleared.",
      );
    } catch {
      setError(
        "Could not clear read notifications.",
      );
    } finally {
      setIsBulkActionRunning(false);
    }
  }

  async function executeClearAll() {
    try {
      setIsBulkActionRunning(true);
      setError("");

      await clearAllNotifications();

      setNotifications([]);
      setSelectedIds(new Set());
      setUnreadCount(0);
      setConfirmAction(null);

      setFeedback(
        "All notifications cleared.",
      );
    } catch {
      setError(
        "Could not clear notifications.",
      );
    } finally {
      setIsBulkActionRunning(false);
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
            isMarkingAllRead ||
            unreadCount === 0
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
              isBulkActionRunning
            }
            className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Clear read
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={
              isBulkActionRunning
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
              isBulkActionRunning
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
              isBulkActionRunning
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
              isBulkActionRunning
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

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void handleLoadMore()}
            disabled={isLoadingMore}
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