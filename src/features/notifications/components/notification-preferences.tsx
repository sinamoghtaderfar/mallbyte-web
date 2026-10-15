"use client";

import { useEffect, useState } from "react";

import {
    getNotificationPreferences,
    updateNotificationPreferences,
} from "@/features/notifications/api";
import type {
    NotificationChannel,
    NotificationPreferences,
    NotificationType,
} from "@/features/notifications/types";
import { getApiErrorMessage } from "@/lib/api/errors";

type ChannelEnabledKey =
  | "in_app_enabled"
  | "email_enabled"
  | "sms_enabled"
  | "push_enabled";

type ChannelOption = {
  channel: NotificationChannel;
  enabledKey: ChannelEnabledKey;
  label: string;
  description: string;
};

const channelOptions: ChannelOption[] = [
  {
    channel: "in_app",
    enabledKey: "in_app_enabled",
    label: "In-app notifications",
    description: "Show notifications in MallByte and in the notification bell.",
  },
  {
    channel: "email",
    enabledKey: "email_enabled",
    label: "Email notifications",
    description: "Receive supported notifications by email.",
  },
  {
    channel: "sms",
    enabledKey: "sms_enabled",
    label: "SMS notifications",
    description: "Receive supported notifications by SMS.",
  },
  {
    channel: "push",
    enabledKey: "push_enabled",
    label: "Push notifications",
    description: "Receive supported push notifications.",
  },
];

const notificationTypeOptions: {
  value: NotificationType;
  label: string;
}[] = [
  { value: "order", label: "Orders" },
  { value: "payment", label: "Payments" },
  { value: "shipping", label: "Shipping" },
  { value: "return", label: "Returns" },
  { value: "discount", label: "Discounts" },
  { value: "system", label: "System" },
  { value: "product", label: "Products" },
  { value: "inventory", label: "Inventory" },
  { value: "support", label: "Support" },
];

function isChannelEnabled(
  preferences: NotificationPreferences,
  option: ChannelOption,
) {
  return (
    preferences[option.enabledKey] &&
    !preferences.muted_channels.includes(option.channel)
  );
}

export function NotificationPreferencesCard() {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    getNotificationPreferences()
      .then((data) => {
        if (!mounted) {
          return;
        }

        setPreferences(data);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setLoadError(getApiErrorMessage(error));
      });

    return () => {
      mounted = false;
    };
  }, []);

  function handleChannelToggle(option: ChannelOption) {
    setSuccessMessage("");
    setSaveError("");

    setPreferences((current) => {
      if (!current) {
        return current;
      }

      const currentlyEnabled = isChannelEnabled(current, option);

      const mutedChannels = currentlyEnabled
        ? Array.from(
            new Set([
              ...current.muted_channels,
              option.channel,
            ]),
          )
        : current.muted_channels.filter(
            (channel) => channel !== option.channel,
          );

      return {
        ...current,
        [option.enabledKey]: !currentlyEnabled,
        muted_channels: mutedChannels,
      };
    });
  }

  function handleTypeToggle(type: NotificationType) {
    setSuccessMessage("");
    setSaveError("");

    setPreferences((current) => {
      if (!current) {
        return current;
      }

      const isMuted =
        current.muted_notification_types.includes(type);

      return {
        ...current,
        muted_notification_types: isMuted
          ? current.muted_notification_types.filter(
              (item) => item !== type,
            )
          : [...current.muted_notification_types, type],
      };
    });
  }

  async function handleSave() {
    if (!preferences) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveError("");
      setSuccessMessage("");

      const updated = await updateNotificationPreferences({
        muted_notification_types:
          preferences.muted_notification_types,
        muted_channels: preferences.muted_channels,
        email_enabled: preferences.email_enabled,
        sms_enabled: preferences.sms_enabled,
        push_enabled: preferences.push_enabled,
        in_app_enabled: preferences.in_app_enabled,
      });

      setPreferences(updated);
      setSuccessMessage("Notification preferences saved.");
    } catch (error) {
      setSaveError(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (!preferences && !loadError) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">
          Loading notification preferences...
        </p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h2 className="font-semibold text-red-950">
          Could not load notification preferences
        </h2>

        <p className="mt-2 text-sm text-red-700">
          {loadError}
        </p>
      </section>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Notifications
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Notification preferences
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Choose how you want to receive notifications and
          which types of updates you want to mute.
        </p>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-950">
          Channels
        </h3>

        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {channelOptions.map((option) => {
            const enabled = isChannelEnabled(
              preferences,
              option,
            );

            return (
              <div
                key={option.channel}
                className="flex items-center justify-between gap-6 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {option.label}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {option.description}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={option.label}
                  onClick={() =>
                    handleChannelToggle(option)
                  }
                  className={[
                    "relative h-7 w-12 shrink-0 rounded-full transition",
                    enabled
                      ? "bg-slate-900"
                      : "bg-slate-300",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
                      enabled ? "left-6" : "left-1",
                    ].join(" ")}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-950">
          Notification types
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Muted categories will not generate new notifications.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notificationTypeOptions.map((option) => {
            const muted =
              preferences.muted_notification_types.includes(
                option.value,
              );

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={muted}
                onClick={() =>
                  handleTypeToggle(option.value)
                }
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  muted
                    ? "border-slate-300 bg-slate-100"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-slate-900">
                  {option.label}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {muted ? "Muted" : "Enabled"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {saveError ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save preferences"}
        </button>
      </div>
    </section>
  );
}