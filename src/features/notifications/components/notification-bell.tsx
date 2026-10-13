"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
} from "@/features/notifications/api";
import type { Notification } from "@/features/notifications/types";

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    getUnreadNotificationCount()
      .then((count) => {
        if (mounted) {
          setUnreadCount(count);
        }
      })
      .catch(() => {
        if (mounted) {
          setUnreadCount(0);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

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
    } catch {
      setError("Could not load notifications.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkRead(notification: Notification) {
    if (notification.is_read) {
      return;
    }

    try {
      const updated = await markNotificationRead(notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      setError("Could not update notification.");
    }
  }

  return (
    <div className="relative">
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
            {unreadCount > 99 ? "99+" : unreadCount}
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
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-slate-500">
              Loading notifications...
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : null}

          {!isLoading && !error && notifications.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              No notifications yet.
            </div>
          ) : null}

          {!isLoading && !error && notifications.length > 0 ? (
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void handleMarkRead(notification)}
                  className={[
                    "block w-full border-b border-slate-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-slate-50",
                    notification.is_read ? "bg-white" : "bg-blue-50/60",
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
                        {notification.title}
                      </p>

                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {notification.message}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}