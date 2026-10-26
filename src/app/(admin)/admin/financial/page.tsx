import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, FileSearch, ShieldCheck } from "lucide-react";

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
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <FinancialNav />
        <header className="rounded-[2rem] bg-slate-950 px-6 py-9 text-white shadow-lg sm:px-10 sm:py-12">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-cyan-300"><ShieldCheck size={17} /> MallByte / Financial workspace</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Financial operations, in context</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Browse currency-separated reports, verified seller ledger activity and persistent database audit results. Each report has a distinct accounting meaning.</p>
          <p className="mt-5 max-w-2xl text-xs leading-6 text-slate-400">Internal records do not independently prove payment processor settlement or bank transfers. Charts represent cash flow or merchandise value, not platform profit.</p>
        </header>
        <section aria-label="Financial tools" className="mt-7 grid gap-4 md:grid-cols-3">
          {cards.map(({ href, title, description, detail, icon: Icon }) => (
            <Link href={href} key={href} className="group flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700">
              <div className="flex items-center justify-between gap-2"><span className="rounded-2xl bg-cyan-50 p-3 text-cyan-800"><Icon size={22}/></span><ArrowUpRight size={20} className="text-slate-400 transition group-hover:text-cyan-700" /></div>
              <h2 className="mt-7 text-lg font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{description}</p>
              <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">{detail}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
