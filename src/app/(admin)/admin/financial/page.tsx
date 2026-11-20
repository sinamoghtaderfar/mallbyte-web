import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, FileSearch } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/states";
import { FinancialNav } from "@/features/insights/components/financial-nav";

const cards = [
  {
    href: "/admin/analytics",
    title: "Cash-flow analytics",
    description: "Explore captured payments and confirmed refunds by period and currency.",
    icon: BarChart3,
    detail: "Read-only reporting",
  },
  {
    href: "/admin/finance",
    title: "Seller ledger & reconciliation",
    description: "Inspect immutable ledger balances, reconciliation findings and authenticated exports.",
    icon: FileSearch,
    detail: "Internal financial evidence",
  },
  {
    href: "/admin/monitoring",
    title: "Audit monitoring",
    description: "Review historical audit runs, open alerts and manual checks when authorized.",
    icon: Activity,
    detail: "Operational controls",
  },
] as const;

/** Accessible to users with view_platform_analytics, not staff-only. */
export default function FinancialWorkspacePage() {
  return (
    <main className="grid gap-6 sm:gap-8">
      <PageHeader eyebrow="Financial workspace" title="Financial operations, in context"
        description="Browse currency-separated reports, verified seller ledger activity and persistent database audit results. Each report has a distinct accounting meaning." />
      <FinancialNav />
      <section aria-label="Financial tools" className="grid gap-4 md:grid-cols-3">
        {cards.map(({ href, title, description, detail, icon: Icon }) => (
          <Link href={href} key={href}
            className="group flex min-h-56 flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-md sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-ember-50 group-hover:text-brand" aria-hidden="true"><Icon size={21} /></span>
              <ArrowUpRight size={18} className="text-slate-400 transition-colors group-hover:text-foreground" aria-hidden="true" />
            </div>
            <h2 className="mt-6 text-base font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-6 text-muted">{description}</p>
            <p className="mb-eyebrow mt-5">{detail}</p>
          </Link>
        ))}
      </section>
      <Notice tone="info">
        Internal records do not independently prove payment processor settlement or bank transfers. Charts represent cash flow or merchandise value, not platform profit.
      </Notice>
    </main>
  );
}
