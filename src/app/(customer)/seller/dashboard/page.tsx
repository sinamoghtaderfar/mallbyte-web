import Link from "next/link";
import { BarChart3, Wallet } from "lucide-react";

import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SellerDashboardCard } from "@/features/seller/components/seller-dashboard-card";

export default function SellerDashboardPage() {
  return (
    <SiteShell>
      <main className="bg-slate-50 px-4 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <Link href="/seller/analytics" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <span className="rounded-xl bg-cyan-50 p-3 text-cyan-700"><BarChart3 size={21} /></span>
                <span className="min-w-0"><strong className="block text-sm text-slate-950">Sales analytics</strong><span className="mt-1 block text-xs text-slate-500">Sales trends and top products</span></span>
                <span className="ml-auto text-slate-400 transition group-hover:translate-x-1">→</span>
              </Link>
              <Link href="/seller/finance" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Wallet size={21} /></span>
                <span className="min-w-0"><strong className="block text-sm text-slate-950">Financial statement</strong><span className="mt-1 block text-xs text-slate-500">Ledger balances, payout eligibility</span></span>
                <span className="ml-auto text-slate-400 transition group-hover:translate-x-1">→</span>
              </Link>
            </div>
            <SellerDashboardCard />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}
