"use client";

import { useEffect } from "react";

type NotificationToastProps = {
  message: string;
  onClose: () => void;
};

export function NotificationToast({
  message,
  onClose,
}: NotificationToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(
      onClose,
      3000,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 left-4 z-[110] rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-xl sm:right-6 sm:bottom-6 sm:left-auto sm:max-w-sm"
    >
      {message}
    </div>
  );
}
