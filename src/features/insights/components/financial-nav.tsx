"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const FINANCIAL_NAV = [
  { href: "/admin/financial", label: "Overview" },
  { href: "/admin/analytics", label: "Cash-flow analytics" },
  { href: "/admin/finance", label: "Reconciliation" },
  { href: "/admin/monitoring", label: "Audit monitoring" },
] as const;

export function FinancialNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Financial workspace" className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex min-w-max gap-1">
        {FINANCIAL_NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold outline-offset-2 transition focus-visible:outline-2 focus-visible:outline-cyan-700 ${active
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
