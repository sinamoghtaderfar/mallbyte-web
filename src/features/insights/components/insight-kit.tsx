"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { Activity, ArrowLeft, CircleAlert, RefreshCw } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Period } from "../types";

export function money(value: string | number, currency: string) {
  // Backend sends decimal strings. Never round them through IEEE-754 Number.
  if (typeof value === "string") {
    const match = /^(-?)(\d+)(\.\d+)?$/.exec(value.trim());
    if (match) {
      const grouped = match[2].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return `${match[1]}${grouped}${match[3] ?? ""} ${currency}`;
    }
    return `${value} ${currency}`;
  }
  if (!Number.isFinite(value)) return `— ${currency}`;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

export function readableDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function InsightHeader({ eyebrow, title, description, backHref, actions }: {
  eyebrow: string; title: string; description: string; backHref: string; actions?: ReactNode;
}) {
  return (
    <header className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-lg shadow-slate-200 sm:px-9 sm:py-10">
      <Link href={backHref} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 transition hover:text-white">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>
      <div className="mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
        </div>
        {actions}
      </div>
    </header>
  );
}

export function PeriodPicker({ value, onChange, disabled = false }: {
  value: Period; onChange: (period: Period) => void; disabled?: boolean;
}) {
  const labels: Array<[Period, string]> = [
    ["today", "Today"], ["week", "7 days"], ["month", "30 days"], ["year", "1 year"],
  ];
  return (
    <div role="group" aria-label="Reporting period" className="inline-flex flex-wrap gap-1 rounded-2xl border border-white/20 bg-white/10 p-1">
      {labels.map(([period, label]) => (
        <button key={period} type="button" disabled={disabled} onClick={() => onChange(period)}
          aria-pressed={value === period}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${value === period ? "bg-white text-slate-950 shadow" : "text-slate-200 hover:bg-white/15"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Metric({ title, value, subtitle, icon }: {
  title: string; value: string; subtitle: string; icon?: ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="text-slate-400">{icon ?? <Activity size={18} />}</span>
      </div>
      <p className="mt-5 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{subtitle}</p>
    </article>
  );
}

export function Panel({ title, subtitle, children, extra }: {
  title: string; subtitle?: string; children: ReactNode; extra?: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function Notice({ children, variant = "info" }: {
  children: ReactNode; variant?: "info" | "error" | "warning";
}) {
  const cls = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  }[variant];
  return (
    <div role={variant === "error" ? "alert" : "note"} className={`flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${cls}`}>
      <CircleAlert size={19} className="mt-0.5 shrink-0" /> <div>{children}</div>
    </div>
  );
}

export function RetryButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
      <RefreshCw size={15} className={disabled ? "animate-spin" : ""} /> Refresh
    </button>
  );
}

export type ChartPoint = { date: string; primary: number; secondary: number };

export function FinancialAreaChart({ points, currency, primaryName, secondaryName }: {
  points: ChartPoint[]; currency: string; primaryName: string; secondaryName: string;
}) {
  const gradientId = useId().replaceAll(":", "");
  if (!points.length || points.every((p) => p.primary === 0 && p.secondary === 0)) {
    return <div role="status" className="flex h-72 items-center justify-center rounded-2xl bg-slate-50 px-5 text-center text-sm text-slate-500">No recorded activity for this currency and period.</div>;
  }
  return (
    <div>
      <div className="h-80 w-full" role="img" aria-label={`Trend chart: ${primaryName} and ${secondaryName}, ${currency}`}>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0891b2" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#0891b2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={20} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} width={65} tickFormatter={(value: number) => new Intl.NumberFormat("en", { notation: "compact" }).format(value)} />
          <Tooltip formatter={(value, name) => [money(Number(value ?? 0), currency), name === "primary" ? primaryName : secondaryName]} contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0", fontSize: 12 }} />
          <Area type="monotone" name="primary" dataKey="primary" stroke="#0891b2" fill={`url(#${gradientId})`} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Area type="monotone" name="secondary" dataKey="secondary" stroke="#f59e0b" fill="transparent" strokeWidth={2} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      </div>
      <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-700">Accessible data table ({points.length} days)</summary>
        <div className="mt-3 max-h-80 overflow-auto">
          <table className="w-full min-w-[400px] text-left text-xs">
            <caption className="sr-only">Daily trend data in {currency}</caption>
            <thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th scope="col" className="px-2 py-2">Date</th><th scope="col" className="px-2 py-2">{primaryName}</th><th scope="col" className="px-2 py-2">{secondaryName}</th></tr></thead>
            <tbody>{points.map((row) => <tr key={row.date} className="border-b border-slate-200"><th scope="row" className="px-2 py-2 font-medium">{row.date}</th><td className="px-2 py-2">{money(row.primary, currency)}</td><td className="px-2 py-2">{money(row.secondary, currency)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
