"use client";

import { AccessibleDialog } from "@/components/ui/accessible-dialog";

type NotificationConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isBusy?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function NotificationConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isBusy = false,
  danger = false,
  onCancel,
  onConfirm,
}: NotificationConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <AccessibleDialog
      onClose={onCancel}
      dismissible={!isBusy}
      closeOnBackdrop
      labelledBy="notification-confirm-title"
      describedBy="notification-confirm-description"
      overlayClassName="fixed inset-0 z-[100] flex items-end justify-center bg-ink/45 backdrop-blur-[2px] sm:items-center sm:p-6"
      className="w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 shadow-2xl outline-none sm:rounded-3xl sm:p-6"
    >
      <h2
        id="notification-confirm-title"
        className="text-lg font-semibold tracking-tight text-foreground"
      >
        {title}
      </h2>

      <p
        id="notification-confirm-description"
        className="mt-3 text-sm leading-6 text-slate-600"
      >
        {description}
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          className="mb-btn mb-btn-secondary"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isBusy}
          className={[
            "rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50",
            danger
              ? "bg-danger hover:bg-rose-800"
              : "bg-ink hover:bg-ink-hover",
          ].join(" ")}
        >
          {isBusy ? "Working..." : confirmLabel}
        </button>
      </div>
    </AccessibleDialog>
  );
}
