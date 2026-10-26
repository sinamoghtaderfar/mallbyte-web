"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CreditCard, Landmark, Package, RotateCcw } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api/errors";
import { downloadChartCsv } from "../finance-utils";
import { getAdminInsights } from "../api";
import { FinancialNav } from "./financial-nav";
import type { Period } from "../types";
import {
  FinancialAreaChart, InsightHeader, Metric, money, Notice, Panel,
  PeriodPicker, RetryButton,
} from "./insight-kit";

type Payload = Awaited<ReturnType<typeof getAdminInsights>>;

export function AdminAnalytics() {
  const [period, setPeriod] = useState<Period>("month");
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<Payload | null>(null);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminInsights(period)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
        setCurrency((previous) => result.dashboard.financial.currencies.some((c) => c.currency === previous)
          ? previous : (result.dashboard.financial.currencies[0]?.currency ?? ""));
      })
      .catch((reason: unknown) => { if (active) setError(getApiErrorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period, revision]);

  const bucket = data?.dashboard.financial.currencies.find((c) => c.currency === currency);
  const series = data?.timeseries.financial.series?.find((c) => c.currency === currency);
  const points = useMemo(() => (series?.points ?? []).map((point) => ({
    date: point.date,
    primary: Number(point.captured_amount),
    secondary: Number(point.refunded_amount),
  })), [series]);

  function changePeriod(next: Period) {
    setPeriod(next);
    setData(null); // Never label stale numbers with a new reporting period.
    setLoading(true);
    setError("");
  }

  function refresh() {
    setRevision((v) => v + 1);
    setLoading(true);
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-50/80 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <FinancialNav />
        <InsightHeader eyebrow="Platform performance" title="Analytics overview"
          description="Explore captured cash flow, refunds and order activity with currency-separated financial reporting."
          backHref="/admin/financial" actions={<PeriodPicker value={period} onChange={changePeriod} disabled={loading} />} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Reporting currency</span>
            <select aria-label="Reporting currency" value={currency} disabled={!data?.dashboard.financial.currencies.length}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
              {!currency && <option value="">No currency yet</option>}
              {data?.dashboard.financial.currencies.map((row) => <option key={row.currency} value={row.currency}>{row.currency}</option>)}
            </select>
          </div>
          <RetryButton onClick={refresh} disabled={loading} />
        </div>
        {loading && <p role="status" className="text-sm text-slate-500">Updating analytics…</p>}
        {error && <Notice variant="error">{error}. <button className="font-semibold underline" onClick={refresh}>Try again</button></Notice>}

        {data && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Platform key metrics">
              <Metric title="Captured cash" value={bucket ? money(bucket.captured_amount, bucket.currency) : "—"}
                subtitle="Verified captures in selected period" icon={<CreditCard size={19} />} />
              <Metric title="Refunded cash" value={bucket ? money(bucket.refunded_amount, bucket.currency) : "—"}
                subtitle="Refunds recognized in selected period" icon={<RotateCcw size={19} />} />
              <Metric title="Net cash flow" value={bucket ? money(bucket.net_cash_flow, bucket.currency) : "—"}
                subtitle="Captures minus refunds; not profit" icon={<Landmark size={19} />} />
              <Metric title="Orders" value={data.dashboard.orders.total_orders.toLocaleString("en-US")}
                subtitle="All statuses, selected period" icon={<Package size={19} />} />
            </section>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
              <Panel title="Financial activity" subtitle="Daily captures and refunded amounts; the axes follow the selected currency.">
                <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-cyan-600" />Captured</span>
                  <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />Refunded</span>
                </div>
                <FinancialAreaChart points={points} currency={currency} primaryName="Captured" secondaryName="Refunded" />
                {points.length > 0 && <button type="button" onClick={() => downloadChartCsv(points, currency, "Captured", "Refunded", "admin-cashflow")}
                  className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Download displayed chart CSV</button>}
              </Panel>
              <Panel title="Cash-flow composition" subtitle="Selected currency only; amounts are not combined across currencies.">
                {bucket ? (
                  <div className="space-y-5">
                    {[
                      ["Captured", bucket.captured_amount, "bg-cyan-600"],
                      ["Refunded", bucket.refunded_amount, "bg-amber-500"],
                    ].map(([label, value, color]) => {
                      const cap = Math.max(Number(bucket.captured_amount), 0);
                      const ratio = cap ? Math.min(100, Math.max(0, (Number(value) / cap) * 100)) : 0;
                      return (
                        <div key={label}>
                          <div className="mb-2 flex justify-between gap-2 text-sm"><span className="text-slate-500">{label}</span><strong className="text-slate-900">{money(value, currency)}</strong></div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${label === "Captured" && cap > 0 ? 100 : ratio}%` }} /></div>
                        </div>
                      );
                    })}
                    <div className="rounded-2xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">Verified payment events</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{bucket.captured_payments_count}</p>
                    </div>
                    <Link href="/admin/finance" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:underline">
                      Open seller balances <ArrowUpRight size={16} />
                    </Link>
                  </div>
                ) : <p className="text-sm text-slate-500">No cash-flow events in this period.</p>}
              </Panel>
            </div>
            {data.dashboard.financial.data_quality?.has_warnings &&
              <Notice variant="warning">Financial data quality checks found possible missing event dates, duplicate captures or order mismatches. Review the internal reconciliation report before using these figures.</Notice>}
            <Notice variant="info">This view uses the Backend&apos;s financial cash-flow contract. Values are grouped by currency and are not platform profit, seller payout, or independent bank reconciliation.</Notice>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/monitoring" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Financial monitoring</Link>
              <Link href="/admin/finance" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100">Reconciliation and balances</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
