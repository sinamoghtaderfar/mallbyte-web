import type { ReactNode } from "react";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "ink";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-ember-50 text-ember-800 ring-ember-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-200",
  danger: "bg-rose-50 text-rose-800 ring-rose-200",
  info: "bg-sky-50 text-sky-900 ring-sky-200",
  ink: "bg-ink text-white ring-ink",
};
const dots: Record<Tone, string> = {
  neutral: "bg-slate-400", brand: "bg-ember-500", success: "bg-emerald-500", warning: "bg-amber-500",
  danger: "bg-rose-500", info: "bg-sky-500", ink: "bg-white",
};

export function Badge({ tone = "neutral", dot = false, children, className = "" }: {
  tone?: Tone; dot?: boolean; children: ReactNode; className?: string;
}) {
  return <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 ring-1 ring-inset [overflow-wrap:anywhere] ${tones[tone]} ${className}`}>
    {dot && <span className={`size-1.5 shrink-0 rounded-full ${dots[tone]}`} aria-hidden="true" />}{children}
  </span>;
}

const statusTones: Record<string, Tone> = {
  // order / payment / shipment / return lifecycles used by the API
  pending: "warning", pending_payment: "warning", awaiting_payment: "warning", requested: "warning", processing: "info",
  confirmed: "info", paid: "success", ready: "info", ready_to_ship: "info", packed: "info", shipped: "info", in_transit: "info",
  out_for_delivery: "info", delivered: "success", completed: "success", received: "info", approved: "success",
  verified: "success", active: "success", published: "success", success: "success", succeeded: "success", resolved: "success",
  open: "warning", in_progress: "info", waiting_customer: "warning", draft: "neutral", archived: "neutral", closed: "neutral",
  refunded: "neutral", partially_refunded: "warning", refund_pending: "warning", cancelled: "danger", canceled: "danger",
  rejected: "danger", failed: "danger", expired: "danger", suspended: "danger", inactive: "neutral", low: "warning",
  out_of_stock: "danger", critical: "danger", high: "danger", medium: "warning",
};

export function statusTone(status: string | null | undefined): Tone {
  if (!status) return "neutral";
  return statusTones[status.toLowerCase().replace(/[\s-]+/g, "_")] ?? "neutral";
}

export function humanize(value: string) {
  const text = value.replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Status pill: tone from the raw API value, label from the API display text when provided. */
export function StatusBadge({ status, label, className }: { status: string | null | undefined; label?: string | null; className?: string }) {
  return <Badge tone={statusTone(status)} dot className={className}>{label || (status ? humanize(status) : "Unknown")}</Badge>;
}
