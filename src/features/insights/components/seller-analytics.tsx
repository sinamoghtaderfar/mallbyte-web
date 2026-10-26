"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Boxes, Coins, ShoppingBag, Undo2 } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api/errors";
import { getSellerInsights } from "../api";
import type { Period } from "../types";
import {
  FinancialAreaChart, InsightHeader, Metric, money, Notice, Panel,
  PeriodPicker, RetryButton,
} from "./insight-kit";

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
    setLoading(true);
    setError("");
  }

  function refresh() {
    setVersion((v) => v + 1);
    setLoading(true);
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <InsightHeader eyebrow="Store performance" title="Your sales analytics"
          description="Track merchandise value and product performance for your own store. Amounts are grouped by currency."
          backHref="/seller/dashboard" actions={<PeriodPicker value={period} onChange={changePeriod} disabled={loading} />} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-3 text-sm font-medium text-slate-600">Currency
            <select aria-label="Seller reporting currency" value={currency} disabled={!data?.dashboard.currencies.length}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">
              {!currency && <option value="">No currency yet</option>}
              {data?.dashboard.currencies.map((row) => <option key={row.currency} value={row.currency}>{row.currency}</option>)}
            </select>
          </label>
          <RetryButton onClick={refresh} disabled={loading} />
        </div>
        {loading && <p role="status" className="text-sm text-slate-500">Loading seller analytics…</p>}
        {error && <Notice variant="error">{error}. <button onClick={refresh} className="font-semibold underline">Try again</button></Notice>}
        {data && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Seller metrics">
              <Metric title="Gross merchandise" value={current ? money(current.gross_merchandise_value, currency) : "—"}
                subtitle="Item prices before discount, tax or shipping" icon={<Coins size={19} />} />
              <Metric title="Net merchandise" value={current ? money(current.net_merchandise_value, currency) : "—"}
                subtitle="After checkout discounts and verified refunds" icon={<ShoppingBag size={19} />} />
              <Metric title="Refunded merchandise" value={current ? money(current.refunded_merchandise_value ?? current.fully_refunded_merchandise_value, currency) : "—"}
                subtitle="Includes verified partial merchandise refunds" icon={<Undo2 size={19} />} />
              <Metric title="Units sold" value={current ? current.units_sold.toLocaleString("en-US") : "—"}
                subtitle={`Active products: ${data.dashboard.catalog?.active_products ?? 0}`} icon={<Boxes size={19} />} />
            </section>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
              <Panel title="Merchandise trend" subtitle="Daily gross and refunded merchandise for the selected currency.">
                <FinancialAreaChart points={points} currency={currency} primaryName="Gross merchandise" secondaryName="Verified refunds" />
              </Panel>
              <Panel title="Top-selling products" subtitle="Ranked by gross merchandise value.">
                {bestProducts.length ? (
                  <ol className="space-y-3">
                    {bestProducts.map((product, index) => (
                      <li key={product.product_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-500">{index + 1}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                            <p className="truncate text-xs text-slate-500">{product.sku} · {product.units_sold} units</p>
                          </div>
                        </div>
                        <span className="whitespace-nowrap text-xs font-bold text-slate-900">{money(product.gross_merchandise_value, currency)}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-slate-500">No sales in this period.</p>}
              </Panel>
            </div>
            <Notice variant="warning">
              Seller metrics use checkout ownership snapshots where available, with legacy fallback for older orders. Net merchandise accounts for checkout discounts and verified merchandise refunds, but is NOT profit or seller payout. For confirmed ledger balances and eligibility, use the finance page.
            </Notice>
            <div className="flex flex-wrap gap-3">
              <Link href="/seller/finance" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">View financial statement</Link>
              <Link href="/seller/products" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100">Manage products</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
