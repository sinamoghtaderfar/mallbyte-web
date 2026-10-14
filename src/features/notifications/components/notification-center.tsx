"use client";

import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/features/notifications/api";
import type { Notification } from "@/features/notifications/types";

type NotificationFilter = "all" | "unread" | "read";

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationCenter() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [loadedFilter, setLoadedFilter] =
    useState<NotificationFilter | null>(null);

  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [error, setError] = useState("");

  const isLoading = loadedFilter !== filter;

  useEffect(() => {
    let mounted = true;

    async function loadNotifications() {
      try {
        const data = await getNotifications(
          filter === "all"
            ? {}
            : {
                is_read: filter === "read",
              },
        );

        if (!mounted) {
          return;
        }

        setNotifications(data);
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

  async function handleOpen(notification: Notification) {
    try {
      if (!notification.is_read) {
        const updated = await markNotificationRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === updated.id ? updated : item,
          ),
        );
      }

      if (notification.action_url.startsWith("/")) {
        router.push(notification.action_url);
      }
    } catch {
      setError("Could not update notification.");
    }
  }

  async function handleToggleRead(notification: Notification) {
    try {
      const updated = notification.is_read
        ? await markNotificationUnread(notification.id)
        : await markNotificationRead(notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );
    } catch {
      setError("Could not update notification.");
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
        })),
      );
    } catch {
      setError("Could not mark all notifications as read.");
    } finally {
      setIsMarkingAllRead(false);
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
            Review updates about your orders, payments, shipments and returns.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleMarkAllRead()}
          disabled={isMarkingAllRead || unreadCount === 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" />

          {isMarkingAllRead ? "Updating..." : "Mark all as read"}
        </button>
      </div>

      <div className="mt-8 flex gap-2">
        {(["all", "unread", "read"] as NotificationFilter[]).map(
          (item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={[
                "rounded-2xl px-4 py-2 text-sm font-medium capitalize transition",
                filter === item
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              {item}
            </button>
          ),
        )}
      </div>

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

      {!isLoading && !error && notifications.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="font-semibold text-slate-950">
            No notifications
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            There are no notifications matching this filter.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && notifications.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={[
                "flex gap-4 border-b border-slate-100 p-5 last:border-b-0",
                notification.is_read
                  ? "bg-white"
                  : "bg-blue-50/50",
              ].join(" ")}
            >
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
                onClick={() => void handleOpen(notification)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-950">
                    {notification.title}
                  </h2>

                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium capitalize text-slate-500">
                    {notification.notification_type}
                  </span>

                  {notification.priority === "high" ||
                  notification.priority === "urgent" ? (
                    <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium capitalize text-red-600">
                      {notification.priority}
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {notification.message}
                </p>

                <p className="mt-3 text-xs text-slate-400">
                  {formatNotificationTime(notification.created_at)}
                </p>
              </button>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => void handleToggleRead(notification)}
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {notification.is_read
                    ? "Mark unread"
                    : "Mark read"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}