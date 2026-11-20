import type { ComponentProps, ReactNode } from "react";

export function Card({ className = "", padded = true, ...props }: ComponentProps<"section"> & { padded?: boolean }) {
  return <section {...props} className={`mb-card min-w-0 ${padded ? "p-5 sm:p-6" : ""} ${className}`} />;
}

export function CardHeader({ title, description, action, eyebrow, as: Heading = "h2", className = "" }: {
  title: ReactNode; description?: ReactNode; action?: ReactNode; eyebrow?: ReactNode; as?: "h2" | "h3"; className?: string;
}) {
  return <div className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-2 ${className}`}>
    <div className="min-w-0">
      {eyebrow && <p className="mb-eyebrow mb-1.5">{eyebrow}</p>}
      <Heading className="text-base font-semibold tracking-tight text-foreground">{title}</Heading>
      {description && <p className="mt-1 text-sm leading-6 text-muted">{description}</p>}
    </div>
    {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
  </div>;
}

export function StatCard({ label, value, hint, icon, tone = "default" }: {
  label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "default" | "brand" | "ink";
}) {
  const surface = tone === "ink" ? "bg-ink text-white border-ink" : tone === "brand" ? "bg-ember-50 border-ember-200" : "bg-surface border-line";
  return <div className={`relative min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5 ${surface}`}>
    <p className={`flex min-h-8 items-center text-sm font-medium ${icon ? "pr-10" : ""} ${tone === "ink" ? "text-slate-300" : "text-muted"}`}>{label}</p>
    {icon && <span className={`absolute top-4 right-4 flex size-8 items-center justify-center rounded-lg sm:top-5 sm:right-5 ${tone === "ink" ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`} aria-hidden="true">{icon}</span>}
    <p data-numeric className="mt-3 text-[1.5rem] font-semibold leading-none tracking-tight [overflow-wrap:anywhere] sm:text-[1.75rem]">{value}</p>
    {hint && <p className={`mt-2 text-xs leading-5 ${tone === "ink" ? "text-slate-400" : "text-muted"}`}>{hint}</p>}
  </div>;
}
