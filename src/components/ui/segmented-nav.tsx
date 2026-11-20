import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type SegmentItem<T extends string = string> = {
  id: T; label: string; icon?: LucideIcon; count?: ReactNode; href?: string; disabled?: boolean;
};

const itemBase = "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45";
const itemIdle = "text-slate-600 hover:bg-slate-100 hover:text-foreground";
const itemActive = "bg-surface text-foreground shadow-sm ring-1 ring-line";

/**
 * In-page section switcher. Active item carries aria-current="page" so assistive
 * tech announces the current section; it scrolls horizontally on narrow screens.
 */
export function SegmentedNav<T extends string>({ label, items, value, onChange, className = "" }: {
  label: string; items: SegmentItem<T>[]; value: T; onChange?: (id: T) => void; className?: string;
}) {
  return <nav aria-label={label} className={`-mx-1 overflow-x-auto px-1 mb-scrollbar-none ${className}`}>
    <div className="inline-flex min-w-max gap-1 rounded-xl border border-line bg-slate-100/70 p-1">
      {items.map(({ id, label: text, icon: Icon, count, href, disabled }) => {
        const active = id === value;
        const content = <>
          {Icon && <Icon size={16} aria-hidden="true" className={active ? "text-brand" : "text-slate-500"} />}
          {text}
          {count !== undefined && count !== null && <span data-numeric className={`rounded-full px-1.5 text-xs ${active ? "bg-slate-100 text-slate-700" : "bg-white/80 text-slate-600"}`}>{count}</span>}
        </>;
        const classes = `${itemBase} ${active ? itemActive : itemIdle}`;
        return href
          ? <Link key={id} href={href} aria-current={active ? "page" : undefined} className={classes}>{content}</Link>
          : <button key={id} type="button" disabled={disabled} aria-current={active ? "page" : undefined} className={classes}
            onClick={() => onChange?.(id)}>{content}</button>;
      })}
    </div>
  </nav>;
}
