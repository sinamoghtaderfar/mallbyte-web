"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { activeWorkspaceHref, type WorkspaceGroup } from "./workspace-nav";

/** SaaS workspace frame: grouped sidebar on desktop, bounded horizontal rail on smaller screens. */
export function WorkspaceShell({ title, subtitle, groups, children, label }: {
  title: string; subtitle?: string; groups: WorkspaceGroup[]; children: ReactNode; label: string;
}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const visible = groups.map((g) => ({ ...g, links: g.links.filter((l) => !l.superOnly || user?.is_superuser) })).filter((g) => g.links.length);
  const active = activeWorkspaceHref(pathname, visible);
  return <div className="mx-auto w-full max-w-[88rem] lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-8 lg:px-8">
    <aside className="border-b border-line bg-surface lg:sticky lg:top-[7.25rem] lg:my-8 lg:max-h-[calc(100dvh-9rem)] lg:self-start lg:overflow-y-auto lg:rounded-2xl lg:border lg:shadow-sm">
      <div className="hidden border-b border-line px-5 py-4 lg:block">
        <p className="mb-eyebrow">{subtitle}</p>
        <p className="mt-1 text-base font-semibold tracking-tight text-ink">{title}</p>
      </div>
      <nav aria-label={label} className="mb-scrollbar-none flex gap-1 overflow-x-auto px-4 py-2.5 sm:px-6 lg:block lg:space-y-4 lg:overflow-visible lg:px-3 lg:py-3.5">
        {visible.map((group) => <div key={group.label} className="contents lg:block">
          <p className="hidden px-2.5 pb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-slate-500 lg:block">{group.label}</p>
          <ul className="contents lg:block lg:space-y-0.5">
            {group.links.map(({ href, label: text, icon: Icon }) => {
              const current = active === href;
              return <li key={href} className="shrink-0">
                <Link href={href} aria-current={current ? "page" : undefined}
                  className={`group relative flex min-h-10 items-center gap-2.5 whitespace-nowrap rounded-full px-3.5 text-sm transition-colors lg:min-h-8.5 lg:rounded-lg lg:px-2.5 ${current ? "bg-ink font-medium text-white lg:bg-slate-100 lg:text-ink" : "text-slate-600 hover:bg-slate-100 hover:text-ink"}`}>
                  {current && <span className="absolute -left-3 top-1.5 hidden h-6 w-1 rounded-r-full bg-brand lg:block" aria-hidden="true" />}
                  <Icon size={16} strokeWidth={1.8} className={`shrink-0 ${current ? "" : "text-slate-500 group-hover:text-ink"}`} aria-hidden="true" />
                  {text}
                </Link>
              </li>;
            })}
          </ul>
        </div>)}
      </nav>
      <div className="hidden border-t border-line px-5 py-4 lg:block">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink">View storefront <ArrowUpRight size={13} aria-hidden="true" /></Link>
      </div>
    </aside>
    <div className="workspace-content min-w-0 px-4 py-7 sm:px-6 lg:px-0 lg:py-8">{children}</div>
  </div>;
}
