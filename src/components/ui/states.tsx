import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`mb-skeleton ${className}`} />;
}

export function EmptyState({ icon, title, description, action, className = "" }: {
  icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string;
}) {
  return <div className={`flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center ${className}`}>
    {icon && <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-8 ring-slate-50" aria-hidden="true">{icon}</div>}
    <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
    {description && <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>}
    {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
  </div>;
}

type NoticeTone = "info" | "success" | "warning" | "danger";
const noticeStyles: Record<NoticeTone, { box: string; icon: typeof Info }> = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-950", icon: Info },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-950", icon: CheckCircle2 },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-950", icon: AlertTriangle },
  danger: { box: "border-rose-200 bg-rose-50 text-rose-950", icon: OctagonAlert },
};

/** Inline message. Errors announce as alerts; other tones as polite status updates. */
export function Notice({ tone = "info", title, children, action, className = "" }: {
  tone?: NoticeTone; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string;
}) {
  const { box, icon: Icon } = noticeStyles[tone];
  return <div role={tone === "danger" ? "alert" : "status"} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm leading-6 ${box} ${className}`}>
    <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
    <div className="min-w-0 flex-1">{title && <p className="font-semibold">{title}</p>}{children && <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>}</div>
    {action && <div className="shrink-0 self-center">{action}</div>}
  </div>;
}
