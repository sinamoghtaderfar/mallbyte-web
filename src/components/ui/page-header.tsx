import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type Crumb = { href?: string; label: string };

export function Breadcrumbs({ items, className = "" }: { items: Crumb[]; className?: string }) {
  return <nav aria-label="Breadcrumb" className={className}>
    <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
      {items.map((item, index) => <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
        {index > 0 && <ChevronRight size={14} className="shrink-0 text-slate-400" aria-hidden="true" />}
        {item.href && index < items.length - 1
          ? <Link href={item.href} className="rounded-sm underline-offset-4 hover:text-foreground hover:underline">{item.label}</Link>
          : <span aria-current={index === items.length - 1 ? "page" : undefined} className="truncate text-foreground">{item.label}</span>}
      </li>)}
    </ol>
  </nav>;
}

/** Shared page heading: optional crumbs, eyebrow, display or workspace title, description and actions. */
export function PageHeader({ eyebrow, title, description, actions, crumbs, display = false, className = "" }: {
  eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; crumbs?: Crumb[]; display?: boolean; className?: string;
}) {
  return <header className={`flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between ${className}`}>
    <div className="min-w-0 max-w-3xl">
      {crumbs && <Breadcrumbs items={crumbs} className="mb-4" />}
      {eyebrow && <p className="mb-eyebrow mb-2">{eyebrow}</p>}
      <h1 className={display ? "mb-display text-[2.5rem] text-foreground sm:text-[3.25rem]" : "text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-[1.75rem]"}>{title}</h1>
      {description && <p className="mt-2.5 max-w-2xl text-[0.9375rem] leading-7 text-muted">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}
