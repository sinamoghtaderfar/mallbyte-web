"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api";
import { useNotificationStore } from "@/features/notifications/notification-store";
import type { Notification } from "@/features/notifications/types";
import { getSessionGeneration, isCurrentSession } from "@/lib/auth/session-storage";

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationBell() {
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = useNotificationStore(
    (state) => state.unreadCount,
  );

  const refreshUnreadCount = useNotificationStore(
    (state) => state.refreshUnreadCount,
  );

  const [isOpen, setIsOpen] = useState(false);
  const pageVersion = useRef(0);
  const mounted = useRef(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [
    isMarkingAllRead,
    setIsMarkingAllRead,
  ] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    mounted.current = true;
    void refreshUnreadCount();

    const intervalId = window.setInterval(() => {
      if (
        document.visibilityState === "visible"
      ) {
        void refreshUnreadCount();
      }
    }, 45_000);

    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible"
      ) {
        void refreshUnreadCount();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      mounted.current = false;
      pageVersion.current += 1;
      window.clearInterval(intervalId);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(
      event: MouseEvent,
    ) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        pageVersion.current += 1;
        setIsOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        pageVersion.current += 1;
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen]);

  async function handleToggle() {
    const nextOpen = !isOpen;
    const query = ++pageVersion.current;
    const session = getSessionGeneration();
    const current = () => mounted.current && query === pageVersion.current && isCurrentSession(session);

    setIsOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const page = await getNotificationsPage(
        {},
        1,
        6,
      );

      if (!current()) return;
      setNotifications(page.results);

      await refreshUnreadCount();
    } catch {
      if (current()) setError("Could not load notifications.");
    } finally {
      if (current()) setIsLoading(false);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (isUpdating || isMarkingAllRead) return;
    const session = getSessionGeneration();
    const query = pageVersion.current;
    setIsUpdating(true);
    try {
      setError("");
      if (!notification.is_read) {
        await markNotificationRead(notification.id);
        if (!mounted.current || !isCurrentSession(session)) return;
        void refreshUnreadCount(true);
      }
      if (!mounted.current || !isCurrentSession(session) || query !== pageVersion.current) return;
      pageVersion.current += 1;
      setIsOpen(false);
      if (notification.action_url.startsWith("/")) router.push(notification.action_url);
    } catch {
      if (mounted.current && isCurrentSession(session) && query === pageVersion.current) {
        setError("Could not update notification.");
      }
    } finally {
      if (mounted.current && isCurrentSession(session)) setIsUpdating(false);
    }
  }

  async function handleMarkAllRead() {
    if (isUpdating || isMarkingAllRead) return;
    const session = getSessionGeneration();
    let query = ++pageVersion.current;
    const current = () => mounted.current && query === pageVersion.current && isCurrentSession(session);
    try {
      setIsMarkingAllRead(true);
      setIsLoading(true);
      setError("");
      await markAllNotificationsRead();
      if (!mounted.current || !isCurrentSession(session)) return;
      // The public badge count and global action are self-scoped, even when
      // superadmins can inspect other users' notification rows.
      query = ++pageVersion.current;
      void refreshUnreadCount(true);
      const page = await getNotificationsPage({}, 1, 6);
      if (current()) setNotifications(page.results);
    } catch {
      if (current()) setError("Could not mark notifications as read.");
    } finally {
      if (current()) setIsLoading(false);
      if (mounted.current && isCurrentSession(session)) setIsMarkingAllRead(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => void handleToggle()}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative flex size-11 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 hover:text-ink"
      >
        <Bell className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />

        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex min-h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-brand px-1 text-[0.6875rem] font-semibold text-white ring-2 ring-background">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="fixed inset-x-4 top-[4.5rem] z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-line bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-13 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-foreground">
                Notifications
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {unreadCount} unread
              </p>
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() =>
                  void handleMarkAllRead()
                }
                disabled={
                  isMarkingAllRead || isUpdating
                }
                className="text-xs font-semibold text-ember-700 underline-offset-4 transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMarkingAllRead
                  ? "Updating..."
                  : "Mark all read"}
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-slate-500">
              Loading notifications...
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="p-6 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {!isLoading &&
          !error &&
          notifications.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              No notifications yet.
            </div>
          ) : null}

          {!isLoading &&
          !error &&
          notifications.length > 0 ? (
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.map(
                (notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() =>
                      void handleNotificationClick(
                        notification,
                      )
                    }
                    disabled={isUpdating || isMarkingAllRead}
                    data-unread={notification.is_read ? "false" : "true"}
                    className={[
                      "block w-full border-b border-slate-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-slate-50",
                      notification.is_read
                        ? "bg-white"
                        : "bg-ember-50/50",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={[
                          "mt-2 h-2 w-2 shrink-0 rounded-full",
                          notification.is_read
                            ? "bg-slate-300"
                            : "bg-brand",
                        ].join(" ")}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {
                            notification.title
                          }
                        </p>

                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                          {
                            notification.message
                          }
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          {formatNotificationTime(
                            notification.created_at,
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ),
              )}
            </div>
          ) : null}

          <div className="border-t border-slate-100 p-3">
            <Link
              href="/notifications"
              onClick={() => {
                pageVersion.current += 1;
                setIsOpen(false);
              }}
              className="flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-foreground"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
