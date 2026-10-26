/** Pure presentation helpers: no currency conversion or financial arithmetic beyond charts. */
export type ExportPoint = { date: string; primary: number; secondary: number };

/** Spreadsheet-safe CSV. Date and numeric values only; no untrusted formulas. */
export function chartToCsv(points: ExportPoint[], primaryName: string, secondaryName: string) {
  const quote = (text: string) => `"${text.replaceAll('"', '""')}"`;
  const safeLabel = (text: string) => quote(/^[=+@\-\t\r]/.test(text) ? `'${text}` : text);
  const amount = (value: number) => Number.isFinite(value) ? String(value) : "";
  const rows = [
    ["Date", primaryName, secondaryName].map(safeLabel).join(","),
    ...points.map((point) => [
      safeLabel(/^\d{4}-\d{2}-\d{2}$/.test(point.date) ? point.date : ""),
      amount(point.primary),
      amount(point.secondary),
    ].join(",")),
  ];
  return `${rows.join("\r\n")}\r\n`;
}

/** Saves ONLY the selected chart data, never an authoritative ledger statement. */
export function downloadChartCsv(
  points: ExportPoint[], currency: string, primaryName: string, secondaryName: string,
  prefix: "admin-cashflow" | "seller-merchandise",
) {
  if (!points.length) return;
  const fileCurrency = /^[A-Za-z]{3,10}$/.test(currency) ? currency.toUpperCase() : "UNKNOWN";
  const csv = chartToCsv(points, primaryName, secondaryName);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${prefix}-${fileCurrency}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a chance to begin reading the Blob before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type FindingRow = { code: string; count: number; samples: string };
export function extractFindings(summary: Record<string, unknown>): FindingRow[] {
  const findings = summary.findings;
  if (!findings || typeof findings !== "object" || Array.isArray(findings)) return [];
  return Object.entries(findings as Record<string, unknown>).map(([code, raw]) => {
    const item = raw && typeof raw === "object" && !Array.isArray(raw)
      ? raw as Record<string, unknown> : {};
    const n = typeof item.count === "number" && Number.isFinite(item.count) ? item.count : 0;
    const ids = Array.isArray(item.sample_ids) ? item.sample_ids
      : Array.isArray(item.sample_allocation_ids) ? item.sample_allocation_ids : [];
    return { code, count: n, samples: ids.filter((v) => typeof v === "number").slice(0, 20).join(", ") };
  });
}
