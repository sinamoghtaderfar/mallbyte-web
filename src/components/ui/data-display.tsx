import type { ComponentProps, ReactNode } from "react";

import type { Tone } from "./badge";

export type DetailItem = { label: ReactNode; value: ReactNode; mono?: boolean; wide?: boolean };

/** Key/value facts rendered as a semantic description list. Empty values show an em dash. */
export function DetailList({ items, columns = 2, className = "" }: {
  items: DetailItem[]; columns?: 1 | 2 | 3; className?: string;
}) {
  const grid = columns === 1 ? "" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return <dl className={`grid gap-x-6 gap-y-4 ${grid} ${className}`}>
    {items.map((item, index) => <div key={index} className={`min-w-0 ${item.wide ? "sm:col-span-full" : ""}`}>
      <dt className="text-xs font-medium text-muted">{item.label}</dt>
      <dd className={`mt-1 text-sm text-foreground [overflow-wrap:anywhere] ${item.mono ? "font-mono text-[0.8125rem]" : ""}`}>
        {item.value === null || item.value === undefined || item.value === "" ? <span className="text-slate-500">—</span> : item.value}
      </dd>
    </div>)}
  </dl>;
}

/** Card-framed horizontally scrollable table. Pass `<table className="mb-table">` as children. */
export function TableFrame({ className = "", children, ...props }: ComponentProps<"div">) {
  return <div {...props} className={`mb-card min-w-0 overflow-hidden ${className}`}>
    <div className="overflow-x-auto overscroll-x-contain">{children}</div>
  </div>;
}

const timelineDots: Record<Tone, string> = {
  neutral: "bg-slate-300", brand: "bg-ember-500", success: "bg-emerald-500", warning: "bg-amber-500",
  danger: "bg-rose-500", info: "bg-sky-500", ink: "bg-ink",
};

export type TimelineItem = { id: string | number; title: ReactNode; meta?: ReactNode; description?: ReactNode; tone?: Tone };

/** Vertical event history (status changes, tracking events, conversation milestones). */
export function Timeline({ items, className = "" }: { items: TimelineItem[]; className?: string }) {
  return <ol className={`relative grid gap-5 ${className}`}>
    {items.map((item, index) => <li key={item.id} className="relative flex gap-3.5">
      <div className="relative flex w-3 shrink-0 justify-center" aria-hidden="true">
        <span className={`relative z-10 mt-1.5 size-2.5 rounded-full ring-4 ring-surface ${timelineDots[item.tone ?? "neutral"]}`} />
        {index < items.length - 1 && <span className="absolute top-4 -bottom-5 w-px bg-line" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          {item.meta && <p className="text-xs text-muted" data-numeric>{item.meta}</p>}
        </div>
        {item.description && <div className="mt-1 text-sm leading-6 text-muted [overflow-wrap:anywhere]">{item.description}</div>}
      </div>
    </li>)}
  </ol>;
}

/** Compact inline metric strip for headers and toolbars. */
export function MetricInline({ items, className = "" }: { items: { label: ReactNode; value: ReactNode }[]; className?: string }) {
  return <dl className={`flex flex-wrap gap-x-6 gap-y-2 ${className}`}>
    {items.map((item, index) => <div key={index} className="min-w-0">
      <dt className="text-xs text-muted">{item.label}</dt>
      <dd data-numeric className="text-sm font-semibold text-foreground">{item.value}</dd>
    </div>)}
  </dl>;
}
