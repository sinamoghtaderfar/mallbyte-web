import { Star } from "lucide-react";

/** The catalog API returns plain decimal amounts without a currency; display them as numbers only. */
export function formatAmount(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

export function discountPercent(price: string | number, compare: string | number | null | undefined) {
  const p = Number(price); const c = Number(compare);
  if (!compare || !Number.isFinite(p) || !Number.isFinite(c) || c <= p || c <= 0) return 0;
  return Math.round(((c - p) / c) * 100);
}

export function Price({ value, compare, size = "md", className = "" }: {
  value: string | number; compare?: string | number | null; size?: "sm" | "md" | "lg" | "xl"; className?: string;
}) {
  const off = discountPercent(value, compare);
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl", xl: "text-[2rem] leading-none" };
  return <div data-numeric className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
    <span className={`font-semibold tracking-tight ${off ? "text-ember-700" : "text-foreground"} ${sizes[size]}`}>{formatAmount(value)}</span>
    {off > 0 && <>
      <span className="text-sm text-slate-500 line-through"><span className="sr-only">Was </span>{formatAmount(compare)}</span>
      <span className="text-xs font-semibold text-ember-700">−{off}%</span>
    </>}
  </div>;
}

export function Rating({ value, count, size = 14, className = "" }: { value: number | string | null | undefined; count?: number; size?: number; className?: string }) {
  const n = Math.max(0, Math.min(5, Number(value) || 0));
  return <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
    <span className="relative inline-flex" aria-hidden="true">
      <span className="flex gap-0.5 text-slate-300">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} fill="currentColor" strokeWidth={0} />)}</span>
      <span className="absolute inset-0 flex gap-0.5 overflow-hidden text-ink" style={{ width: `${(n / 5) * 100}%` }}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} fill="currentColor" strokeWidth={0} className="shrink-0" />)}</span>
    </span>
    <span className="sr-only">Rated {n.toFixed(1)} out of 5</span>
    {count !== undefined && <span className="text-muted" aria-hidden={false}>{n > 0 ? n.toFixed(1) : "—"}{count > 0 ? ` (${count})` : ""}</span>}
  </span>;
}
