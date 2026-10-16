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
      className="fixed bottom-6 right-6 z-[110] max-w-sm rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl"
    >
      {message}
    </div>
  );
}
