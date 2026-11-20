"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, ClipboardList, HeartHandshake, PackageCheck } from "lucide-react";

import { StatCard } from "@/components/ui/card";
import { ADMIN_NAV } from "@/components/layout/workspace-nav";
import { useAuthStore } from "@/features/auth/auth-store";
import { getAdminPendingSellers } from "@/features/admin-sellers/api";
import { getAdminInsights } from "@/features/insights/api";
import { getAdminReturns } from "@/features/returns/admin-api";

type Snapshot = { value: number | null; state: "loading" | "ready" | "unavailable" };
const loading: Snapshot = { value: null, state: "loading" };

const descriptions: Record<string, string> = {
  "/admin/orders": "Customer orders and fulfilment states.",
  "/admin/returns": "Returns and verified refund workflows.",
  "/admin/shipments": "Parcels and delivery operations.",
  "/admin/inventory": "Stock, reservations and warehouse activity.",
  "/warehouse/transfers": "Warehouse-to-warehouse stock transfers.",
  "/admin/sellers": "Review applications and verify stores.",
  "/admin/financial": "All analytics, ledger and audit tools in one place.",
  "/admin/analytics": "Cash flow, refunds and multi-currency trends.",
  "/admin/finance": "Seller ledger, discrepancy reports and CSV exports.",
  "/admin/monitoring": "Audit history, open alerts and controlled checks.",
  "/admin/content": "Pages, banners, announcements, FAQs and navigation. Requires a content role.",
  "/admin/observability": "System health, API logs, alerts and incidents. Requires an Observability role.",
  "/admin/observability/workflows": "Approved operational workflows and runbooks.",
  "/admin/super": "Users, roles, product moderation and audit history. Superusers only.",
};

function snapshotValue(s: Snapshot): ReactNode {
  if (s.state === "loading") return <span className="mb-skeleton inline-block h-7 w-14 align-middle" aria-label="Loading" />;
  if (s.state === "unavailable") return <span className="text-base font-medium text-slate-500">—</span>;
  return s.value;
}

/** Control center: live counts come from existing endpoints and degrade per-permission. */
export function ControlCenter() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Snapshot>(loading);
  const [pendingSellers, setPendingSellers] = useState<Snapshot>(loading);
  const [returns, setReturns] = useState<Snapshot>(loading);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const settle = (set: (s: Snapshot) => void) => [
      (value: number) => { if (active) set({ value, state: "ready" }); },
      () => { if (active) set({ value: null, state: "unavailable" }); },
    ] as const;
    void getAdminInsights("month").then((r) => r.dashboard.orders.total_orders).then(...settle(setOrders));
    void getAdminPendingSellers(1, controller.signal).then((r) => r.count).then(...settle(setPendingSellers));
    void getAdminReturns(1, controller.signal).then((r) => r.count).then(...settle(setReturns));
    return () => { active = false; controller.abort(); };
  }, []);

  const groups = ADMIN_NAV.map((g) => ({ ...g, links: g.links.filter((l) => l.href !== "/admin" && (!l.superOnly || user?.is_superuser)) }));

  return (
    <div className="space-y-10">
      <header className="relative isolate overflow-hidden rounded-2xl bg-ink px-6 py-8 text-white sm:px-8 sm:py-10">
        <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 size-80 rounded-full bg-brand/25 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ember-300">MallByte / Workspace</p>
        <h1 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.02em] sm:text-[2rem]">Admin control center</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">One workspace for marketplace operations, content management and financial oversight. Every section enforces its own permissions.</p>
      </header>

      <section aria-label="Live snapshot" className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders this month" value={snapshotValue(orders)} icon={<ClipboardList size={16} />} hint={orders.state === "unavailable" ? "Requires platform analytics permission" : "From platform analytics"} />
        <StatCard label="Seller applications pending" value={snapshotValue(pendingSellers)} icon={<HeartHandshake size={16} />} hint={<Link href="/admin/sellers" className="underline-offset-4 hover:underline">Review applications</Link>} />
        <StatCard label="Return requests" value={snapshotValue(returns)} icon={<PackageCheck size={16} />} hint={<Link href="/admin/returns" className="underline-offset-4 hover:underline">Open returns queue</Link>} />
      </section>

      {groups.map((group) => (
        <section key={group.label} aria-labelledby={`cc-${group.label}`}>
          <h2 id={`cc-${group.label}`} className="text-sm font-semibold text-slate-950">{group.label}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.links.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="group flex h-full items-start gap-4 rounded-xl border border-line bg-surface p-4 shadow-xs transition hover:border-line-strong hover:shadow-md">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 transition group-hover:bg-ink group-hover:text-white" aria-hidden="true"><Icon size={18} strokeWidth={1.8} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-950">{label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">{descriptions[href]}</span>
                  </span>
                  <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-slate-400 transition group-hover:text-ink" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
