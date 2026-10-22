"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  downloadFinancialCsv,
  fetchPayoutEligibility,
  fetchSellerStatement,
} from "../api";
import { displayDate, displayMoney } from "../format";
import type { PayoutEligibility, SellerStatement } from "../types";

export function SellerFinanceDashboard() {
  const [statement, setStatement] = useState<SellerStatement | null>(null);
  const [statementVersion, setStatementVersion] = useState(0);
  const [currency, setCurrency] = useState("");
  const [eligibility, setEligibility] = useState<PayoutEligibility | null>(null);
  const [eligibilityVersion, setEligibilityVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [eligibilityError, setEligibilityError] = useState("");

  useEffect(() => {
    let active = true;

    // The request is an external operation. All state changes happen
    // in its asynchronous callbacks, not synchronously in this effect.
    void fetchSellerStatement()
      .then((data) => {
        if (!active) return;
        setStatement(data);
        setError("");
        setEligibility(null);
        setEligibilityLoading(true);
        setEligibilityError("");
        setCurrency((previous) =>
          data.currencies.some((entry) => entry.currency === previous)
            ? previous
            : (data.currencies[0]?.currency ?? ""),
        );
        setEligibilityVersion((previous) => previous + 1);
      })
      .catch((err: unknown) => {
        if (active) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [statementVersion]);

  const refresh = () => {
    setLoading(true);
    setError("");
    setStatementVersion((previous) => previous + 1);
  };

  useEffect(() => {
    if (!currency) {
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const data = await fetchPayoutEligibility(currency);
        if (active) {
          setEligibility(data);
          setEligibilityError("");
        }
      } catch (err) {
        if (active) {
          setEligibility(null);
          setEligibilityError(getApiErrorMessage(err));
        }
      } finally {
        if (active) setEligibilityLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [currency, eligibilityVersion]);

  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      await downloadFinancialCsv("seller");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  const selected = statement?.currencies.find((value) => value.currency === currency);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Seller finances</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Financial statement</h1>
          <p className="mt-2 text-sm text-slate-600">Confirmed seller ledger entries and payout eligibility.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={refresh} disabled={loading}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50">Refresh</button>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting || !statement}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && !statement ? <p role="status" className="mt-8 text-slate-600">Loading financial statement...</p> : null}
      {statement ? (
        <>
          {statement.currencies.length ? (
            <>
              <div className="mt-8 flex items-center gap-3">
                <label htmlFor="seller-finance-currency" className="text-sm font-medium text-slate-700">Currency</label>
                <select id="seller-finance-currency" value={currency} onChange={(e) => {
                  setEligibility(null);
                  setEligibilityLoading(true);
                  setEligibilityError("");
                  setCurrency(e.target.value);
                }}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                  {statement.currencies.map((entry) => <option key={entry.currency} value={entry.currency}>{entry.currency}</option>)}
                </select>
              </div>
              {selected && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {([
                  ["Sales credits", selected.sales],
                  ["Refund reversals", selected.refunds],
                  ["Payouts", selected.payouts],
                  ["Ledger balance", selected.balance],
                ] as const).map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-3 break-all text-xl font-semibold text-slate-950">{displayMoney(value, currency)}</p>
                  </div>
                ))}
              </div>}
              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-slate-950">Payout eligibility</h2>
                {eligibilityLoading && <p className="mt-3 text-sm text-slate-500">Checking available amount...</p>}
                {eligibilityError && <p role="alert" className="mt-3 text-sm text-red-700">{eligibilityError}</p>}
                {eligibility && eligibility.currency === currency && (
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
                    <div>
                      <p className="text-sm text-slate-600">Withdrawable amount (informational only)</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">{displayMoney(eligibility.withdrawable_amount, currency)}</p>
                    </div>
                    <p className="text-sm text-slate-500">Release hold: {eligibility.hold_days} days</p>
                  </div>
                )}
                <p className="mt-4 text-xs text-slate-500">No bank transfer is initiated from this page.</p>
              </section>
            </>
          ) : (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
              No ledger entries yet. Complete a test checkout and payment to populate the statement.
            </div>
          )}
          <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Recent ledger activity</h2>
            {statement.recent_entries.length === 0 ? <p className="mt-4 text-sm text-slate-500">No activity yet.</p> : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[550px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500"><tr><th className="py-3">Date</th><th>Type</th><th>Amount</th></tr></thead>
                  <tbody>{statement.recent_entries.map((entry, index) => (
                    <tr key={`${entry.occurred_at}-${entry.kind}-${index}`} className="border-b border-slate-100">
                      <td className="py-3 text-slate-600">{displayDate(entry.occurred_at)}</td>
                      <td className="capitalize text-slate-700">{entry.kind}</td>
                      <td className="font-medium text-slate-950">{displayMoney(entry.amount, entry.currency)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <p className="mt-5 text-xs text-slate-500">{statement.notice}</p>
        </>
      ) : null}
      <Link className="mt-8 inline-block text-sm font-medium text-slate-700 underline" href="/seller/dashboard">Back to seller dashboard</Link>
    </main>
  );
}
