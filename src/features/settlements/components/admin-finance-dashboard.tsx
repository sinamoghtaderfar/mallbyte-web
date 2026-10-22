"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
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
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Admin / Settlements</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950">Financial control center</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Read-only financial reconciliation and seller ledger balances. Database checks do not confirm external bank settlements.
      </p>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-950">Reconciliation findings</h2>
          <div className="flex gap-2">
            <button type="button" disabled={reportLoading} onClick={refreshReport}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Refresh</button>
            <button type="button" disabled={!report || exporting !== null} onClick={() => void exportCsv("reconciliation")}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {exporting === "reconciliation" ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
        {reportError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{reportError}</p>}
        {reportLoading && !report && <p role="status" className="mt-4 text-sm text-slate-500">Checking financial records...</p>}
        {report && (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${report.total_findings ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>
                {report.total_findings ? `${report.total_findings} detected findings` : "No detected mismatches"}
              </span>
              <span className="text-xs text-slate-500">Checked: {displayDate(report.generated_at)}</span>
            </div>
            {reportLoading && <p className="mt-3 text-xs text-slate-500">Refreshing report...</p>}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {findings.map(([name, finding]) => (
                <div key={name} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium capitalize leading-5 text-slate-600">{displayFindingName(name)}</p>
                  <p className={`mt-2 text-2xl font-semibold ${finding.count > 0 ? "text-amber-700" : "text-slate-950"}`}>{finding.count}</p>
                  {(finding.sample_ids?.length || finding.sample_allocation_ids?.length) ? (
                    <p className="mt-1 break-all text-xs text-slate-400">Sample IDs: {(finding.sample_ids ?? finding.sample_allocation_ids ?? []).join(", ")}</p>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-slate-500">Counts may overlap. This report is not an independent bank or processor audit.</p>
          </>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-950">Seller ledger balances</h2>
          <button type="button" disabled={exporting !== null} onClick={() => void exportCsv("balances")}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {exporting === "balances" ? "Exporting..." : "Export balances CSV"}
          </button>
        </div>
        <form onSubmit={applyFilters} className="mt-5 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Seller ID
            <input value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} inputMode="numeric" placeholder="All sellers"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Currency
            <input value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)} placeholder="All currencies" maxLength={10}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase" />
          </label>
          <button type="submit" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium">Apply filters</button>
        </form>
        {filterError && <p role="alert" className="mt-3 text-sm text-red-700">{filterError}</p>}
        {balanceError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">{balanceError}</p>}
        {balanceLoading && <p role="status" className="mt-4 text-sm text-slate-500">Loading seller balances...</p>}
        {balances && (
          <>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[550px] text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500"><tr><th className="py-3">Seller ID</th><th>Currency</th><th>Ledger balance</th><th>Entries</th></tr></thead>
                <tbody>{balances.results.map((row) => (
                  <tr key={`${row.seller_id}-${row.currency}`} className="border-b border-slate-100">
                    <td className="py-3 text-slate-700">{row.seller_id}</td>
                    <td className="text-slate-600">{row.currency}</td>
                    <td className="font-medium text-slate-950">{displayMoney(row.balance, row.currency)}</td>
                    <td className="text-slate-600">{row.entry_count}</td>
                  </tr>
                ))}</tbody>
              </table>
              {!balances.results.length && <p className="py-5 text-sm text-slate-500">No seller balances match these filters.</p>}
            </div>
            <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
              <span>{balances.count} seller/currency groups · Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1 || balanceLoading} onClick={() => {
                  setBalanceLoading(true);
                  setBalanceError("");
                  setPage((v) => Math.max(1, v - 1));
                }}
                  className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">Previous</button>
                <button type="button" disabled={page >= pages || balanceLoading} onClick={() => {
                  setBalanceLoading(true);
                  setBalanceError("");
                  setPage((v) => v + 1);
                }}
                  className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </section>
      <Link href="/admin" className="mt-8 inline-block text-sm font-medium text-slate-700 underline">Back to admin dashboard</Link>
    </main>
  );
}
