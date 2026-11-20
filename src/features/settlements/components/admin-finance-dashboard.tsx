"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Filter, Landmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { FinancialNav } from "@/features/insights/components/financial-nav";
import { RefreshButton } from "@/features/insights/components/insight-kit";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  downloadFinancialCsv,
  fetchAdminBalances,
  fetchReconciliation,
} from "../api";
import { displayDate, displayFindingName, displayMoney } from "../format";
import type { AdminBalancePage, AdminBalanceQuery, ReconciliationReport } from "../types";

const PAGE_SIZE = 20;

export function AdminFinanceDashboard() {
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [reportVersion, setReportVersion] = useState(0);
  const [balances, setBalances] = useState<AdminBalancePage | null>(null);
  const [page, setPage] = useState(1);
  const [sellerFilter, setSellerFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [filters, setFilters] = useState<Pick<AdminBalanceQuery, "seller_id" | "currency">>({});
  const [reportLoading, setReportLoading] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [exporting, setExporting] = useState<"reconciliation" | "balances" | null>(null);
  const [reportError, setReportError] = useState("");
  const [balanceError, setBalanceError] = useState("");
  const [filterError, setFilterError] = useState("");

  useEffect(() => {
    let active = true;

    void fetchReconciliation(20)
      .then((data) => {
        if (!active) return;
        setReport(data);
        setReportError("");
      })
      .catch((err: unknown) => {
        if (active) setReportError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setReportLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reportVersion]);

  const refreshReport = () => {
    setReportLoading(true);
    setReportError("");
    setReportVersion((previous) => previous + 1);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchAdminBalances({ ...filters, page, page_size: PAGE_SIZE });
        if (active) {
          setBalances(data);
          setBalanceError("");
        }
      } catch (err) {
        if (active) setBalanceError(getApiErrorMessage(err));
      } finally {
        if (active) setBalanceLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [filters, page]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilterError("");
    const rawSeller = sellerFilter.trim();
    const rawCurrency = currencyFilter.trim();
    if (rawSeller && (!/^[1-9]\d*$/.test(rawSeller) || !Number.isSafeInteger(Number(rawSeller)))) {
      setFilterError("Seller ID must be a positive integer.");
      return;
    }
    if (rawCurrency && !/^[a-zA-Z]{3,10}$/.test(rawCurrency)) {
      setFilterError("Currency must contain 3–10 letters.");
      return;
    }
    setBalanceLoading(true);
    setBalanceError("");
    setBalances(null);
    setPage(1);
    setFilters({
      ...(rawSeller ? { seller_id: Number(rawSeller) } : {}),
      ...(rawCurrency ? { currency: rawCurrency.toUpperCase() } : {}),
    });
  }

  async function exportCsv(kind: "reconciliation" | "balances") {
    setExporting(kind);
    setReportError("");
    setBalanceError("");
    try {
      await downloadFinancialCsv(kind, filters);
    } catch (err) {
      if (kind === "reconciliation") setReportError(getApiErrorMessage(err));
      else setBalanceError(getApiErrorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  const findings = Object.entries(report?.findings ?? {});
  const pages = Math.max(1, Math.ceil((balances?.count ?? 0) / PAGE_SIZE));

  return (
    <main className="grid gap-6">
      <PageHeader eyebrow="Settlements" title="Financial control center"
        description="Read-only financial reconciliation and seller ledger balances. Database checks do not confirm external bank settlements." />
      <FinancialNav />

      <Card>
        <CardHeader title="Reconciliation findings" description="Internal consistency checks across orders, payments, refunds and ledger allocations."
          action={<>
            <RefreshButton onClick={refreshReport} busy={reportLoading && Boolean(report)} disabled={reportLoading} />
            <Button disabled={!report || exporting !== null} loading={exporting === "reconciliation"} onClick={() => void exportCsv("reconciliation")}>
              {exporting !== "reconciliation" && <Download size={15} aria-hidden="true" />}{exporting === "reconciliation" ? "Exporting..." : "Export CSV"}
            </Button>
          </>} />
        <div className="mt-5 grid gap-5">
          {reportError && <Notice tone="danger" action={<Button size="small" variant="secondary" onClick={refreshReport}>Retry</Button>}>{reportError}</Notice>}
          {reportLoading && !report && <div role="status" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <span className="sr-only">Checking financial records...</span>
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>}
          {report && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={report.total_findings ? "warning" : "success"} dot>
                  {report.total_findings ? `${report.total_findings} detected findings` : "No detected mismatches"}
                </Badge>
                <span className="text-xs text-muted">Checked: {displayDate(report.generated_at)}</span>
                {reportLoading && <span role="status" className="text-xs text-muted">Refreshing report...</span>}
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {findings.map(([name, finding]) => {
                  const samples = finding.sample_ids ?? finding.sample_allocation_ids ?? [];
                  const flagged = finding.count > 0;
                  return (
                    <li key={name} className={`rounded-xl border p-4 ${flagged ? "border-amber-200 bg-amber-50/60" : "border-line bg-surface"}`}>
                      <p className="text-xs font-medium capitalize leading-5 text-muted">{displayFindingName(name)}</p>
                      <p data-numeric className={`mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight ${flagged ? "text-amber-900" : "text-foreground"}`}>
                        {flagged ? <AlertTriangle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} className="text-success" aria-hidden="true" />}
                        {finding.count}
                      </p>
                      {samples.length > 0 && <p className="mt-1.5 font-mono text-xs break-all text-muted">Sample IDs: {samples.join(", ")}</p>}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted">Counts may overlap. This report is not an independent bank or processor audit.</p>
            </>
          )}
        </div>
      </Card>

      <Card padded={false} className="overflow-hidden">
        <div className="grid gap-5 p-5 sm:p-6">
          <CardHeader title="Seller ledger balances" description="Immutable ledger totals grouped by seller and currency."
            action={<Button variant="secondary" disabled={exporting !== null} loading={exporting === "balances"} onClick={() => void exportCsv("balances")}>
              {exporting !== "balances" && <Download size={15} aria-hidden="true" />}{exporting === "balances" ? "Exporting..." : "Export balances CSV"}
            </Button>} />
          <form onSubmit={applyFilters} className="flex flex-col gap-3 rounded-xl border border-line bg-sunken/50 p-3 sm:flex-row sm:items-end">
            <Field label="Seller ID" htmlFor="balance-seller" className="sm:w-44">
              <Input id="balance-seller" value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} inputMode="numeric" placeholder="All sellers" />
            </Field>
            <Field label="Currency" htmlFor="balance-currency" className="sm:w-44">
              <Input id="balance-currency" value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)} placeholder="All currencies" maxLength={10} className="uppercase" />
            </Field>
            <Button type="submit" variant="secondary"><Filter size={15} aria-hidden="true" />Apply filters</Button>
          </form>
          {filterError && <Notice tone="danger">{filterError}</Notice>}
          {balanceError && <Notice tone="danger">{balanceError}</Notice>}
        </div>
        {balanceLoading && !balances && <TableSkeletonRows label="Loading seller balances..." />}
        {balanceLoading && balances && <p role="status" className="sr-only">Loading seller balances...</p>}
        {balances && (
          <>
            {balances.results.length ? (
              <div className="overflow-x-auto border-t border-line">
                <table className="mb-table min-w-[32rem]">
                  <thead><tr><th scope="col">Seller ID</th><th scope="col">Currency</th><th scope="col" className="text-right">Ledger balance</th><th scope="col" className="text-right">Entries</th></tr></thead>
                  <tbody>{balances.results.map((row) => (
                    <tr key={`${row.seller_id}-${row.currency}`}>
                      <td className="font-mono text-[0.8125rem] text-slate-700">#{row.seller_id}</td>
                      <td><Badge>{row.currency}</Badge></td>
                      <td className="text-right font-semibold text-foreground">{displayMoney(row.balance, row.currency)}</td>
                      <td className="text-right text-muted">{row.entry_count}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <EmptyState className="mx-5 mb-5 py-10" icon={<Landmark size={22} />} title="No seller balances match these filters" description="Clear the seller or currency filter to see every ledger group." />}
            <Pagination className="border-t border-line px-5 py-3" label="Seller balance pages"
              summary={`${balances.count} seller/currency groups · Page ${page} of ${pages}`}
              canPrevious={page > 1} canNext={page < pages} disabled={balanceLoading}
              onPrevious={() => { setBalanceLoading(true); setBalanceError(""); setPage((v) => Math.max(1, v - 1)); }}
              onNext={() => { setBalanceLoading(true); setBalanceError(""); setPage((v) => v + 1); }} />
          </>
        )}
      </Card>
      <Link href="/admin/financial" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-700 underline-offset-4 hover:text-foreground hover:underline">
        <ArrowLeft size={15} aria-hidden="true" />Back to financial workspace
      </Link>
    </main>
  );
}

function TableSkeletonRows({ label }: { label: string }) {
  return <div role="status" className="grid gap-2 border-t border-line p-5">
    <span className="sr-only">{label}</span>
    {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
  </div>;
}
