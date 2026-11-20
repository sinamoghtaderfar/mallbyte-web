"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CreditCard, Download, Landmark, Package, RotateCcw } from "lucide-react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Notice } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

import { getAdminInsights } from "../api";
import { downloadChartCsv } from "../finance-utils";
import type { Period } from "../types";
import { FinancialNav } from "./financial-nav";
import {
  CHART_COLORS, DashboardSkeleton, FinancialAreaChart, money, periodLabel, PeriodPicker, RefreshButton, Toolbar,
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

  const currencies = data?.dashboard.financial.currencies ?? [];

  return (
    <main className="grid gap-6">
      <PageHeader eyebrow="Platform performance" title="Analytics overview"
        description="Explore captured cash flow, refunds and order activity with currency-separated financial reporting." />
      <FinancialNav />

      <Toolbar label="Report filters" end={<RefreshButton onClick={refresh} busy={loading && Boolean(data)} disabled={loading} />}>
        <PeriodPicker value={period} onChange={changePeriod} disabled={loading} />
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="whitespace-nowrap">Currency</span>
          <Select aria-label="Reporting currency" value={currency} disabled={!currencies.length}
            onChange={(e) => setCurrency(e.target.value)} className="w-32">
            {!currency && <option value="">No currency yet</option>}
            {currencies.map((row) => <option key={row.currency} value={row.currency}>{row.currency}</option>)}
          </Select>
        </label>
      </Toolbar>

      {error && <Notice tone="danger" title="Analytics could not be loaded" action={<Button size="small" variant="secondary" onClick={refresh}>Try again</Button>}>{error}</Notice>}
      {loading && !data && <DashboardSkeleton label="Updating analytics…" />}

      {data && (
        <>
          <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4" aria-label="Platform key metrics">
            <StatCard label="Captured cash" value={bucket ? money(bucket.captured_amount, bucket.currency) : "—"}
              hint={`Verified captures · ${periodLabel(period)}`} icon={<CreditCard size={16} />} tone="ink" />
            <StatCard label="Refunded cash" value={bucket ? money(bucket.refunded_amount, bucket.currency) : "—"}
              hint="Refunds recognized in period" icon={<RotateCcw size={16} />} />
            <StatCard label="Net cash flow" value={bucket ? money(bucket.net_cash_flow, bucket.currency) : "—"}
              hint="Captures minus refunds; not profit" icon={<Landmark size={16} />} />
            <StatCard label="Orders" value={data.dashboard.orders.total_orders.toLocaleString("en-US")}
              hint="All statuses, selected period" icon={<Package size={16} />} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader title="Financial activity" description="Daily captures and refunded amounts in the selected currency."
                action={points.length > 0 && <Button size="small" variant="secondary"
                  onClick={() => downloadChartCsv(points, currency, "Captured", "Refunded", "admin-cashflow")}>
                  <Download size={15} aria-hidden="true" />Download displayed chart CSV</Button>} />
              <div className="mt-5"><FinancialAreaChart points={points} currency={currency} primaryName="Captured" secondaryName="Refunded" /></div>
            </Card>
            <Card>
              <CardHeader title="Cash-flow composition" description="Selected currency only; amounts are never combined across currencies." />
              {bucket ? (
                <div className="mt-5 grid gap-5">
                  {([
                    ["Captured", bucket.captured_amount, CHART_COLORS.ember],
                    ["Refunded", bucket.refunded_amount, CHART_COLORS.ink],
                  ] as const).map(([label, value, color]) => {
                    const cap = Math.max(Number(bucket.captured_amount), 0);
                    const ratio = cap ? Math.min(100, Math.max(0, (Number(value) / cap) * 100)) : 0;
                    const width = label === "Captured" && cap > 0 ? 100 : ratio;
                    return (
                      <div key={label}>
                        <div className="mb-2 flex justify-between gap-2 text-sm">
                          <span className="text-muted">{label}</span>
                          <strong data-numeric className="font-semibold text-foreground">{money(value, currency)}</strong>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="presentation">
                          <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="rounded-xl border border-line bg-sunken/60 p-4">
                    <p className="text-sm text-muted">Verified payment events</p>
                    <p data-numeric className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{bucket.captured_payments_count}</p>
                  </div>
                  <Link href="/admin/finance" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline">
                    Open seller balances <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              ) : <EmptyState className="mt-5 py-10" title="No cash-flow events" description="Nothing was captured or refunded in this period." />}
            </Card>
          </div>

          {data.dashboard.financial.data_quality?.has_warnings &&
            <Notice tone="warning" title="Data quality warnings">Financial data quality checks found possible missing event dates, duplicate captures or order mismatches. Review the internal reconciliation report before using these figures.</Notice>}
          <Notice tone="info">This view uses the Backend&apos;s financial cash-flow contract. Values are grouped by currency and are not platform profit, seller payout, or independent bank reconciliation.</Notice>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/monitoring" className={buttonStyles()}>Financial monitoring</Link>
            <Link href="/admin/finance" className={buttonStyles({ variant: "secondary" })}>Reconciliation and balances</Link>
          </div>
        </>
      )}
    </main>
  );
}
