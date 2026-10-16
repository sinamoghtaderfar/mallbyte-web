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
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api";
import { useNotificationStore } from "@/features/notifications/notification-store";
import type { Notification } from "@/features/notifications/types";

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

  const setUnreadCount = useNotificationStore(
    (state) => state.setUnreadCount,
  );

  const decrementUnreadCount = useNotificationStore(
    (state) => state.decrementUnreadCount,
  );

  const refreshUnreadCount = useNotificationStore(
    (state) => state.refreshUnreadCount,
  );

  const [isOpen, setIsOpen] = useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [
    isMarkingAllRead,
    setIsMarkingAllRead,
  ] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
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

    function handleMouseDown(
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
        setIsOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleMouseDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleMouseDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen]);

  async function handleToggle() {
    const nextOpen = !isOpen;

    setIsOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const data = await getNotifications();

      setNotifications(data.slice(0, 6));

      await refreshUnreadCount();
    } catch {
      setError(
        "Could not load notifications.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNotificationClick(
    notification: Notification,
  ) {
    try {
      setError("");

      if (!notification.is_read) {
        const updated =
          await markNotificationRead(
            notification.id,
          );

        setNotifications((current) =>
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item,
          ),
        );

        decrementUnreadCount();
      }

      setIsOpen(false);

      if (
        notification.action_url.startsWith(
          "/",
        )
      ) {
        router.push(
          notification.action_url,
        );
      }
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

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
          read_at:
            notification.read_at ??
            new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
    } catch {
      setError(
        "Could not mark notifications as read.",
      );
    } finally {
      setIsMarkingAllRead(false);
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
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-950">
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
                  isMarkingAllRead
                }
                className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="p-6 text-sm text-red-600">
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
                    className={[
                      "block w-full border-b border-slate-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-slate-50",
                      notification.is_read
                        ? "bg-white"
                        : "bg-blue-50/60",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={[
                          "mt-2 h-2 w-2 shrink-0 rounded-full",
                          notification.is_read
                            ? "bg-slate-300"
                            : "bg-blue-600",
                        ].join(" ")}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-950">
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
              onClick={() =>
                setIsOpen(false)
              }
              className="flex h-10 items-center justify-center rounded-2xl text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}