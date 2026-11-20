"use client";

import { useId, useState, type ReactNode } from "react";

import { AccessibleDialog } from "./accessible-dialog";
import { Button } from "./button";
import { Field, Textarea } from "./input";

export const dialogOverlayClass = "fixed inset-0 z-[80] flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6";
export const dialogPanelClass = "max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-2xl outline-none sm:max-w-lg sm:rounded-3xl sm:p-6";

/**
 * Confirmation for consequential actions. Optionally collects a reason that
 * must meet `reasonMinLength` before the confirm action becomes available.
 */
export function ConfirmDialog({
  title, description, confirmLabel, cancelLabel = "Cancel", tone = "primary", busy = false,
  reasonLabel, reasonMinLength = 0, reasonHint, onConfirm, onCancel, children,
}: {
  title: ReactNode; description?: ReactNode; confirmLabel: string; cancelLabel?: string;
  tone?: "primary" | "danger"; busy?: boolean; reasonLabel?: string; reasonMinLength?: number; reasonHint?: ReactNode;
  onConfirm: (reason: string) => void; onCancel: () => void; children?: ReactNode;
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const reasonValid = !reasonLabel || reason.trim().length >= reasonMinLength;
  return <AccessibleDialog labelledBy={`${id}-title`} describedBy={description ? `${id}-desc` : undefined}
    onClose={onCancel} dismissible={!busy} closeOnBackdrop overlayClassName={dialogOverlayClass} className={dialogPanelClass}>
    <form onSubmit={(event) => { event.preventDefault(); if (reasonValid && !busy) onConfirm(reason.trim()); }}>
      <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {description && <div id={`${id}-desc`} className="mt-2 text-sm leading-6 text-muted">{description}</div>}
      {children}
      {reasonLabel && <Field className="mt-5" label={reasonLabel} htmlFor={`${id}-reason`} hintId={`${id}-hint`}
        hint={reasonHint ?? (reasonMinLength ? `At least ${reasonMinLength} characters.` : undefined)} required={reasonMinLength > 0}>
        <Textarea id={`${id}-reason`} data-dialog-initial-focus value={reason} rows={3} aria-describedby={`${id}-hint`}
          onChange={(event) => setReason(event.target.value)} />
      </Field>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
        <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} loading={busy} disabled={!reasonValid}>{confirmLabel}</Button>
      </div>
    </form>
  </AccessibleDialog>;
}
