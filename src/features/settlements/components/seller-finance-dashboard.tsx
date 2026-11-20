"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Clock3, Download, Undo2, Wallet } from "lucide-react";

import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { DashboardSkeleton, RefreshButton, Toolbar } from "@/features/insights/components/insight-kit";
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
    <main className="grid gap-6">
      <PageHeader eyebrow="Seller finances" title="Financial statement"
        description="Confirmed seller ledger entries and payout eligibility."
        crumbs={[{ href: "/seller/dashboard", label: "Seller overview" }, { label: "Finance" }]}
        actions={<>
          <Link href="/seller/analytics" className={buttonStyles({ variant: "secondary" })}>Sales analytics</Link>
          <RefreshButton onClick={refresh} busy={loading && Boolean(statement)} disabled={loading} />
          <Button onClick={() => void exportCsv()} disabled={exporting || !statement} loading={exporting}>
            {!exporting && <Download size={15} aria-hidden="true" />}{exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </>} />

      {error && <Notice tone="danger" action={<Button size="small" variant="secondary" onClick={refresh}>Retry</Button>}>{error}</Notice>}
      {loading && !statement ? <DashboardSkeleton label="Loading financial statement..." /> : null}
      {statement ? (
        <>
          {statement.currencies.length ? (
            <>
              <Toolbar label="Statement currency">
                <label htmlFor="seller-finance-currency" className="text-sm font-medium text-foreground">Currency</label>
                <Select id="seller-finance-currency" className="w-32" value={currency} onChange={(e) => {
                  setEligibility(null);
                  setEligibilityLoading(true);
                  setEligibilityError("");
                  setCurrency(e.target.value);
                }}>
                  {statement.currencies.map((entry) => <option key={entry.currency} value={entry.currency}>{entry.currency}</option>)}
                </Select>
              </Toolbar>
              {selected && <section aria-label="Ledger totals" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                <StatCard label="Sales credits" value={displayMoney(selected.sales, currency)} icon={<ArrowDownLeft size={16} />} />
                <StatCard label="Refund reversals" value={displayMoney(selected.refunds, currency)} icon={<Undo2 size={16} />} />
                <StatCard label="Payouts" value={displayMoney(selected.payouts, currency)} icon={<ArrowUpRight size={16} />} />
                <StatCard label="Ledger balance" value={displayMoney(selected.balance, currency)} icon={<Wallet size={16} />} tone="ink" />
              </section>}
              <Card>
                <CardHeader title="Payout eligibility" description="What the ledger currently allows you to withdraw after the release hold." />
                <div className="mt-5" aria-live="polite">
                  {eligibilityLoading && <div role="status" className="grid gap-2"><span className="sr-only">Checking available amount...</span><Skeleton className="h-4 w-56" /><Skeleton className="h-8 w-40" /></div>}
                  {eligibilityError && <Notice tone="danger">{eligibilityError}</Notice>}
                  {eligibility && eligibility.currency === currency && (
                    <div className="flex flex-wrap items-end justify-between gap-5 rounded-xl border border-line bg-sunken/50 p-4 sm:p-5">
                      <div>
                        <p className="text-sm text-muted">Withdrawable amount (informational only)</p>
                        <p data-numeric className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{displayMoney(eligibility.withdrawable_amount, currency)}</p>
                      </div>
                      <Badge tone="neutral"><Clock3 size={12} aria-hidden="true" />Release hold: {eligibility.hold_days} days</Badge>
                    </div>
                  )}
                </div>
                <p className="mt-4 text-xs text-muted">No bank transfer is initiated from this page.</p>
              </Card>
            </>
          ) : (
            <EmptyState icon={<Wallet size={24} />} title="No ledger entries yet"
              description="Complete a test checkout and payment to populate the statement."
              action={<Link href="/seller/products" className={buttonStyles({ variant: "secondary" })}>Manage products</Link>} />
          )}
          <Card padded={false} className="overflow-hidden">
            <CardHeader className="p-5 sm:p-6" title="Recent ledger activity" description="Most recent confirmed ledger entries across currencies." />
            {statement.recent_entries.length === 0 ? <p className="border-t border-line px-5 py-6 text-sm text-muted sm:px-6">No activity yet.</p> : (
              <div className="overflow-x-auto border-t border-line">
                <table className="mb-table min-w-[30rem]">
                  <thead><tr><th scope="col">Date</th><th scope="col">Type</th><th scope="col" className="text-right">Amount</th></tr></thead>
                  <tbody>{statement.recent_entries.map((entry, index) => (
                    <tr key={`${entry.occurred_at}-${entry.kind}-${index}`}>
                      <td className="whitespace-nowrap text-muted">{displayDate(entry.occurred_at)}</td>
                      <td><StatusBadge status={entry.kind} /></td>
                      <td className="text-right font-semibold text-foreground">{displayMoney(entry.amount, entry.currency)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Card>
          <p className="text-xs leading-5 text-muted">{statement.notice}</p>
        </>
      ) : null}
      <Link className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-700 underline-offset-4 hover:text-foreground hover:underline" href="/seller/dashboard">
        <ArrowLeft size={15} aria-hidden="true" />Back to seller dashboard
      </Link>
    </main>
  );
}
