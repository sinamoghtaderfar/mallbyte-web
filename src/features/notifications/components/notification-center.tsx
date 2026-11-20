"use client";

import {
  CheckCheck,
  Bell,
  BellOff,
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
          <p className="mb-eyebrow">
            Account
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Notifications
          </h1>

          <p className="mt-2 text-sm text-muted">
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
          className="gap-2 mb-btn mb-btn-secondary"
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />

          {isMarkingAllRead
            ? "Updating..."
            : "Mark all as read"}
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-2 shadow-xs">
        <div role="group" aria-label="Filter notifications" className="inline-flex gap-1 rounded-xl bg-slate-100/80 p-1">
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
              aria-pressed={filter === item}
              className={[
                "min-h-10 rounded-lg px-4 text-sm font-medium capitalize transition-colors disabled:opacity-50",
                filter === item
                  ? "bg-surface text-foreground shadow-sm ring-1 ring-line"
                  : "text-slate-600 hover:bg-slate-100 hover:text-foreground",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pr-1">
          <button
            type="button"
            onClick={handleClearRead}
            disabled={
              isBulkActionRunning || isMarkingAllRead || isItemActionRunning || isLoading
            }
            className="mb-btn mb-btn-secondary mb-btn-sm"
          >
            Clear read
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={
              isBulkActionRunning || isMarkingAllRead || isItemActionRunning || isLoading
            }
            className="mb-btn mb-btn-secondary text-rose-700 hover:bg-rose-50 mb-btn-sm"
          >
            Clear all
          </button>
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="sticky top-20 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-ink bg-ink p-2.5 pl-4 text-white shadow-lg">
          <span className="mr-2 text-sm font-semibold" aria-live="polite">
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
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <MailOpen className="h-4 w-4" aria-hidden="true" />
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
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Mark unread
          </button>

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={
              isBulkActionRunning || isMarkingAllRead || isItemActionRunning || isLoading
            }
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          {error}
          <button
            type="button"
            onClick={() => handleFilterChange(filter)}
            className="mb-btn mb-btn-secondary mb-btn-sm"
          >
            Retry notifications
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 mb-card divide-y divide-line overflow-hidden" aria-busy="true">
          <p className="sr-only">Loading notifications...</p>
          {[0, 1, 2, 3].map((i) => <div key={i} className="flex gap-4 p-5"><div className="mb-skeleton size-9 shrink-0 rounded-xl" /><div className="grid flex-1 gap-2"><div className="mb-skeleton h-4 w-1/3" /><div className="mb-skeleton h-3 w-2/3" /></div></div>)}
        </div>
      ) : null}

      {!isLoading &&
      !error &&
      notifications.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
          <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-8 ring-slate-50" aria-hidden="true"><BellOff className="h-6 w-6" /></span>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            No notifications
          </h2>

          <p className="mt-2 text-sm text-muted">
            There are no notifications
            matching this filter.
          </p>
        </div>
      ) : null}

      {!isLoading &&
      !error &&
      notifications.length > 0 ? (
        <div className="mt-6 mb-card overflow-hidden">
          <div className="flex min-h-11 items-center gap-3 border-b border-line bg-sunken/60 px-5 py-2.5">
            <input
              type="checkbox"
              aria-label="Select all notifications"
              checked={allVisibleSelected}
              onChange={handleSelectAll}
              className="h-4 w-4 rounded border-slate-300"
            />

            <span className="text-xs font-semibold text-muted">
              Select all
            </span>
          </div>

          {notifications.map(
            (notification) => (
              <div
                key={notification.id}
                className={[
                  "group relative grid grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-b border-line px-4 py-4 last:border-b-0 sm:flex sm:gap-4 sm:px-5",
                  notification.is_read
                    ? "bg-surface"
                    : "bg-ember-50/40 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand",
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
                  className="mt-2.5 h-4 w-4 shrink-0 rounded border-slate-300"
                />

                <span
                  aria-hidden="true"
                  className={[
                    "relative flex size-9 shrink-0 items-center justify-center rounded-xl",
                    notification.is_read
                      ? "bg-slate-100 text-slate-500"
                      : "bg-surface text-brand ring-1 ring-ember-200",
                  ].join(" ")}
                >
                  <Bell className="h-4 w-4" />
                  {!notification.is_read ? <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-brand ring-2 ring-surface" /> : null}
                </span>

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
                    <h2 className={notification.is_read ? "font-medium text-slate-800" : "font-semibold text-foreground"}>
                      {
                        notification.title
                      }
                    </h2>
                    {!notification.is_read ? <span className="sr-only">(unread)</span> : null}

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600 ring-1 ring-inset ring-slate-200">
                      {
                        notification.notification_type
                      }
                    </span>

                    {notification.priority ===
                      "high" ||
                    notification.priority ===
                      "urgent" ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium capitalize text-rose-800 ring-1 ring-inset ring-rose-200">
                        {
                          notification.priority
                        }
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-slate-700">
                    {
                      notification.message
                    }
                  </p>

                  <p className="mt-2 text-xs text-muted">
                    {formatNotificationTime(
                      notification.created_at,
                    )}
                  </p>
                </button>

                <div className="col-start-3 -ml-3 shrink-0 sm:ml-0">
                  <button
                    type="button"
                    onClick={() =>
                      void handleToggleRead(
                        notification,
                      )
                    }
                    disabled={isItemActionRunning || isBulkActionRunning || isMarkingAllRead}
                    className="min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-foreground disabled:opacity-50"
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
            className="mb-btn mb-btn-secondary"
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
