"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Boxes, Coins, Download, ShoppingBag, Trophy, Undo2 } from "lucide-react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Notice } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

import { getSellerInsights } from "../api";
import { downloadChartCsv } from "../finance-utils";
import type { Period } from "../types";
import { DashboardSkeleton, FinancialAreaChart, money, periodLabel, PeriodPicker, RefreshButton, Toolbar } from "./insight-kit";

type Payload = Awaited<ReturnType<typeof getSellerInsights>>;

export function SellerAnalytics() {
  const [period, setPeriod] = useState<Period>("month");
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<Payload | null>(null);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getSellerInsights(period)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
        setCurrency((old) => result.dashboard.currencies.some((c) => c.currency === old)
          ? old : (result.dashboard.currencies[0]?.currency ?? ""));
      })
      .catch((reason: unknown) => { if (active) setError(getApiErrorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period, version]);

  const current = data?.dashboard.currencies.find((row) => row.currency === currency);
  const sellerSeries = data?.timeseries.series.find((row) => row.currency === currency);
  const bestProducts = data?.products.products_by_currency.find((row) => row.currency === currency)?.products ?? [];
  const points = useMemo(() => (sellerSeries?.points ?? []).map((row) => ({
    date: row.date,
    primary: Number(row.gross_merchandise_value),
    secondary: Number(row.refunded_merchandise_value ?? row.fully_refunded_merchandise_value),
  })), [sellerSeries]);

  function changePeriod(next: Period) {
    setPeriod(next);
    setData(null); // Never label stale numbers with a new reporting period.
    setLoading(true);
    setError("");
  }

  function refresh() {
    setVersion((v) => v + 1);
    setLoading(true);
    setError("");
  }

  const currencies = data?.dashboard.currencies ?? [];

  return (
    <main className="grid gap-6">
      <PageHeader eyebrow="Store performance" title="Your sales analytics"
        description="Review your store’s merchandise activity, including discounts and refunds. Totals are separated by currency."
        crumbs={[{ href: "/seller/dashboard", label: "Seller overview" }, { label: "Analytics" }]} />

      <Toolbar label="Report filters" end={<RefreshButton onClick={refresh} busy={loading && Boolean(data)} disabled={loading} />}>
        <PeriodPicker value={period} onChange={changePeriod} disabled={loading} />
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>Currency</span>
          <Select aria-label="Seller reporting currency" value={currency} disabled={!currencies.length}
            onChange={(e) => setCurrency(e.target.value)} className="w-32">
            {!currency && <option value="">No currency yet</option>}
            {currencies.map((row) => <option key={row.currency} value={row.currency}>{row.currency}</option>)}
          </Select>
        </label>
      </Toolbar>

      {error && <Notice tone="danger" title="Analytics could not be loaded" action={<Button size="small" variant="secondary" onClick={refresh}>Try again</Button>}>{error}</Notice>}
      {loading && !data && <DashboardSkeleton label="Loading seller analytics…" />}

      {data && (
        <>
          <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4" aria-label="Seller metrics">
            <StatCard label="Gross merchandise" value={current ? money(current.gross_merchandise_value, currency) : "—"}
              hint={`Before discount, tax or shipping · ${periodLabel(period)}`} icon={<Coins size={16} />} tone="ink" />
            <StatCard label="Net merchandise" value={current ? money(current.net_merchandise_value, currency) : "—"}
              hint="After checkout discounts and verified refunds" icon={<ShoppingBag size={16} />} />
            <StatCard label="Refunded merchandise" value={current ? money(current.refunded_merchandise_value ?? current.fully_refunded_merchandise_value, currency) : "—"}
              hint="Includes verified partial merchandise refunds" icon={<Undo2 size={16} />} />
            <StatCard label="Units sold" value={current ? current.units_sold.toLocaleString("en-US") : "—"}
              hint={`Active products: ${data.dashboard.catalog?.active_products ?? 0}`} icon={<Boxes size={16} />} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader title="Merchandise trend" description="Daily gross and refunded merchandise for the selected currency."
                action={points.length > 0 && <Button size="small" variant="secondary"
                  onClick={() => downloadChartCsv(points, currency, "Gross merchandise", "Verified refunds", "seller-merchandise")}>
                  <Download size={15} aria-hidden="true" />Download displayed chart CSV</Button>} />
              <div className="mt-5"><FinancialAreaChart points={points} currency={currency} primaryName="Gross merchandise" secondaryName="Verified refunds" /></div>
            </Card>
            <Card>
              <CardHeader title="Top-selling products" description="Ranked by gross merchandise value." />
              {bestProducts.length ? (
                <ol className="mt-5 divide-y divide-line">
                  {bestProducts.map((product, index) => (
                    <li key={product.product_id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <span data-numeric className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${index === 0 ? "bg-ink text-white" : "bg-slate-100 text-slate-600"}`}>{index + 1}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                          <p className="truncate text-xs text-muted"><span className="font-mono">{product.sku}</span> · {product.units_sold} units</p>
                        </div>
                      </div>
                      <span data-numeric className="text-sm font-semibold whitespace-nowrap text-foreground">{money(product.gross_merchandise_value, currency)}</span>
                    </li>
                  ))}
                </ol>
              ) : <EmptyState className="mt-5 py-10" icon={<Trophy size={22} />} title="No sales in this period" description="Try a longer period, or check that your products are published." />}
            </Card>
          </div>

          {!data.dashboard.accounting_notes.partial_refunds_supported &&
            <Notice tone="warning">This backend does not report verified partial refunds in seller merchandise analytics. The figures may be incomplete until the financial API hardening is merged and deployed.</Notice>}
          <Notice tone="info" title="How to read these figures">
            Seller metrics use checkout ownership snapshots where available, with legacy fallback for older orders. Net merchandise accounts for checkout discounts and verified merchandise refunds, but is NOT profit or seller payout. For confirmed ledger balances and eligibility, use the finance page.
          </Notice>
          <div className="flex flex-wrap gap-2">
            <Link href="/seller/finance" className={buttonStyles()}>View financial statement</Link>
            <Link href="/seller/products" className={buttonStyles({ variant: "secondary" })}>Manage products</Link>
          </div>
        </>
      )}
    </main>
  );
}
