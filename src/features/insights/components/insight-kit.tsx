"use client";

import { useId, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";

import type { Period } from "../types";

/**
 * Chart palette drawn from the Ink & Ember tokens in globals.css. SVG attributes
 * need literal colours, so the token values are mirrored here; keep in sync.
 */
export const CHART_COLORS = {
  ember: "#c93d0b",
  emberSoft: "#fec9aa",
  ink: "#121211",
  neutral: "#8b877e",
  grid: "#e4e1da",
  axis: "#6b675f",
  success: "#12704a",
  danger: "#b42335",
} as const;

export const chartTooltipStyle = {
  borderRadius: 12,
  border: `1px solid ${CHART_COLORS.grid}`,
  boxShadow: "0 8px 24px rgb(18 18 17 / 0.08)",
  fontSize: 12,
  padding: "8px 12px",
} as const;

export const chartTick = { fontSize: 11, fill: CHART_COLORS.axis } as const;

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

export const PERIOD_OPTIONS: Array<[Period, string]> = [
  ["today", "Today"], ["week", "7 days"], ["month", "30 days"], ["year", "1 year"],
];

export function periodLabel(period: Period) {
  return PERIOD_OPTIONS.find(([value]) => value === period)?.[1] ?? period;
}

/** Segmented toggle group for the reporting period. Buttons expose aria-pressed. */
export function PeriodPicker({ value, onChange, disabled = false, label = "Reporting period" }: {
  value: Period; onChange: (period: Period) => void; disabled?: boolean; label?: string;
}) {
  return (
    <ToggleGroup label={label} value={value} onChange={onChange} disabled={disabled}
      options={PERIOD_OPTIONS.map(([id, text]) => ({ id, label: text }))} />
  );
}

/** Generic pressed-state toggle group used for periods and time windows. */
export function ToggleGroup<T extends string>({ label, value, options, onChange, disabled = false }: {
  label: string; value: T; options: Array<{ id: T; label: string }>; onChange: (value: T) => void; disabled?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-line bg-slate-100/70 p-1">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button key={option.id} type="button" disabled={disabled} aria-pressed={active} onClick={() => onChange(option.id)}
            className={`inline-flex min-h-11 items-center rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${active
              ? "bg-surface text-foreground shadow-sm ring-1 ring-line"
              : "text-slate-600 hover:bg-slate-100 hover:text-foreground"}`}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function RefreshButton({ onClick, busy = false, disabled = false, label = "Refresh" }: {
  onClick: () => void; busy?: boolean; disabled?: boolean; label?: string;
}) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled} loading={busy}>
      {!busy && <RefreshCw size={16} aria-hidden="true" />}
      {label}
    </Button>
  );
}

/** Filter/period toolbar that sits between the page header and the content. */
export function Toolbar({ label, children, end }: { label: string; children: ReactNode; end?: ReactNode }) {
  return (
    <div role="toolbar" aria-label={label} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-3">{children}</div>
      {end && <div className="flex flex-wrap items-center gap-2">{end}</div>}
    </div>
  );
}

export type LegendItem = { label: string; color: string; dashed?: boolean };

/** Visible legend: identity is carried by label + line style, never colour alone. */
export function ChartLegend({ items, note }: { items: LegendItem[]; note?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs text-muted">
      <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Chart legend">
        {items.map((item) => (
          <li key={item.label} className="inline-flex items-center gap-2 text-slate-700">
            <svg width="22" height="8" aria-hidden="true" className="shrink-0">
              <line x1="1" y1="4" x2="21" y2="4" stroke={item.color} strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={item.dashed ? "4 4" : undefined} />
            </svg>
            {item.label}
          </li>
        ))}
      </ul>
      {note && <p>{note}</p>}
    </div>
  );
}

/** Disclosure holding the full chart data as a table for screen readers and keyboard users. */
export function ChartDataTable({ caption, summary, children }: { caption: string; summary: string; children: ReactNode }) {
  return (
    <details className="group mt-4 rounded-xl border border-line bg-slate-50/60 text-sm">
      <summary className="flex min-h-11 items-center rounded-xl px-4 font-medium text-slate-700 hover:text-foreground">{summary}</summary>
      <div className="max-h-80 overflow-auto border-t border-line">
        <table className="mb-table">
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
    </details>
  );
}

export type ChartPoint = { date: string; primary: number; secondary: number };

export function FinancialAreaChart({ points, currency, primaryName, secondaryName }: {
  points: ChartPoint[]; currency: string; primaryName: string; secondaryName: string;
}) {
  const gradientId = useId().replaceAll(":", "");
  if (!points.length || points.every((p) => p.primary === 0 && p.secondary === 0)) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-slate-50/60 px-5 text-center">
        <p className="text-sm font-medium text-foreground">No recorded activity</p>
        <p className="mt-1 max-w-sm text-sm text-muted">Nothing was captured or refunded in {currency || "this currency"} for the selected period. Try a longer period.</p>
      </div>
    );
  }
  const first = points[0].date;
  const last = points[points.length - 1].date;
  return (
    <div className="min-w-0">
      <ChartLegend
        items={[
          { label: primaryName, color: CHART_COLORS.ember },
          { label: secondaryName, color: CHART_COLORS.ink, dashed: true },
        ]}
        note={<>Daily amounts in <span className="font-medium text-slate-700">{currency}</span></>}
      />
      <div className="mt-4 h-72 w-full min-w-0 sm:h-80" role="img"
        aria-label={`Trend chart: daily ${primaryName} and ${secondaryName} in ${currency}, ${first} to ${last}. Values are listed in the data table below.`}>
        <ResponsiveContainer width="100%" height="100%" minHeight={256}>
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.ember} stopOpacity={0.2} />
                <stop offset="100%" stopColor={CHART_COLORS.ember} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tickLine={false} axisLine={{ stroke: CHART_COLORS.grid }}
              tick={chartTick} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} tick={chartTick} width={56}
              tickFormatter={(value: number) => new Intl.NumberFormat("en", { notation: "compact" }).format(value)} />
            <Tooltip cursor={{ stroke: CHART_COLORS.neutral, strokeDasharray: "3 3" }} contentStyle={chartTooltipStyle}
              formatter={(value, name) => [money(Number(value ?? 0), currency), name === "primary" ? primaryName : secondaryName]} />
            <Area type="monotone" name="primary" dataKey="primary" stroke={CHART_COLORS.ember} fill={`url(#${gradientId})`}
              strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }} isAnimationActive={false} />
            <Area type="monotone" name="secondary" dataKey="secondary" stroke={CHART_COLORS.ink} fill="transparent"
              strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable caption={`Daily ${primaryName} and ${secondaryName} in ${currency}`} summary={`View data table (${points.length} days)`}>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col" className="text-right">{primaryName}</th>
            <th scope="col" className="text-right">{secondaryName}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((row) => (
            <tr key={row.date}>
              <th scope="row" className="bg-transparent font-medium text-foreground">{row.date}</th>
              <td className="text-right">{money(row.primary, currency)}</td>
              <td className="text-right">{money(row.secondary, currency)}</td>
            </tr>
          ))}
        </tbody>
      </ChartDataTable>
    </div>
  );
}

/** Content-shaped placeholder: KPI row, wide chart card and a side card. */
export function DashboardSkeleton({ label, kpis = 4 }: { label: string; kpis?: number }) {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: kpis }, (_, i) => <Skeleton key={i} className="h-[7.5rem] rounded-2xl" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="mb-card space-y-4 p-5 sm:p-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="mb-card space-y-4 p-5 sm:p-6">
          <Skeleton className="h-5 w-40" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

/** Rows of placeholder lines shaped like a data table. */
export function TableSkeleton({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <div role="status" className="mb-card space-y-3 p-5">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
    </div>
  );
}
