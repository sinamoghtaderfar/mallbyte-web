"use client";

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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4"
      role="presentation"
      onMouseDown={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-confirm-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <h2
          id="notification-confirm-title"
          className="text-xl font-semibold text-slate-950"
        >
          {title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {description}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                ? "bg-red-600 hover:bg-red-700"
                : "bg-slate-900 hover:bg-slate-800",
            ].join(" ")}
          >
            {isBusy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
