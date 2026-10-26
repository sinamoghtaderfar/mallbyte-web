"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, FileSearch, Play, ShieldCheck } from "lucide-react";

import { getMyPermissions } from "@/features/rbac/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { getApiErrorMessage } from "@/lib/api/errors";
import { extractFindings } from "../finance-utils";
import { findAuditRunByKey, getAuditHistory, getAuditRunDetail, startManualAudit } from "../api";
import type { AuditRunDetail } from "../types";
import { FinancialNav } from "./financial-nav";
import { InsightHeader, Metric, Notice, Panel, readableDate, RetryButton } from "./insight-kit";

type History = Awaited<ReturnType<typeof getAuditHistory>>;
const PAGE_SIZE = 10;

function AuditStatus({ status }: { status: string }) {
  const styles: Record<string, string> = {
    clean: "bg-emerald-50 text-emerald-700",
    warnings: "bg-amber-50 text-amber-800",
    error: "bg-rose-50 text-rose-700",
    running: "bg-sky-50 text-sky-700",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-700"}`}>{status}</span>;
}

export function FinancialMonitoring() {
  const userId = useAuthStore((s) => s.user?.id);
  const [page, setPage] = useState(1);
  const [alertPage, setAlertPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState<{ userId: number; canRun: boolean } | null>(null);
  const [running, setRunning] = useState(false);
  const [queuedKey, setQueuedKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [detail, setDetail] = useState<AuditRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [requestedDetailId, setRequestedDetailId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void getAuditHistory(page, PAGE_SIZE, alertPage)
      .then((result) => { if (active) { setHistory(result); setError(""); } })
      .catch((reason: unknown) => { if (active) { setHistory(null); setError(getApiErrorMessage(reason)); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, alertPage, revision]);

  useEffect(() => {
    if (userId == null) return;
    let active = true;
    void getMyPermissions()
      .then((result) => {
        if (active) setPermission({
          userId, canRun: result.user_id === userId && result.permissions.includes("manage_analytics_reports"),
        });
      })
      .catch(() => { if (active) setPermission({ userId, canRun: false }); });
    return () => { active = false; };
  }, [userId]);

  function refresh() {
    setLoading(true);
    setError("");
    setRevision((v) => v + 1);
  }

  const canRun = permission !== null && permission.userId === userId && permission.canRun;
  async function runAudit() {
    if (!canRun || running || queuedKey) return;
    setRunning(true);
    setActionMessage("");
    setError("");
    try {
      const job = await startManualAudit();
      if ("queued" in job && job.queued) {
        setActionMessage(`Audit queued (task ${job.task_id}). Waiting for its saved result…`);
        setQueuedKey(job.run_key);
      } else if ("id" in job) {
        setActionMessage(`Audit #${job.id} completed: ${job.status}.`);
        setPage(1);
        refresh();
      } else {
        setActionMessage("The audit API returned an unrecognized response. Refresh history to verify its state.");
      }
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setRunning(false);
    }
  }

  // Poll only the exact queue-generated run key. A missing run is NOT success.
  useEffect(() => {
    if (!queuedKey) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function check() {
      try {
        const result = await findAuditRunByKey(queuedKey!);
        if (!active) return;
        if (result && result.status !== "running") {
          setActionMessage(`Audit #${result.id} finished: ${result.status}.`);
          setQueuedKey(null);
          setPage(1);
          setAlertPage(1);
          setLoading(true);
          setRevision((v) => v + 1);
          return;
        }
      } catch (reason) {
        if (!active) return;
        setActionMessage(`Audit queued. Status check failed: ${getApiErrorMessage(reason)}. Retrying…`);
      }
      attempts += 1;
      if (attempts < 20) {
        timer = setTimeout(() => { void check(); }, 3000);
      } else if (active) {
        setActionMessage("Audit not finished or worker unavailable. Review worker logs and refresh history.");
        setQueuedKey(null);
      }
    }
    void check();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [queuedKey]);

  useEffect(() => {
    if (requestedDetailId == null) return;
    let active = true;
    void getAuditRunDetail(requestedDetailId)
      .then((result) => { if (active) { setDetail(result); setDetailError(""); } })
      .catch((reason: unknown) => { if (active) { setDetail(null); setDetailError(getApiErrorMessage(reason)); } })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [requestedDetailId]);

  function inspectRun(id: number) {
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    setRequestedDetailId(id);
  }

  const runs = history?.runs;
  const alerts = history?.alerts;
  const totalPages = Math.max(1, Math.ceil((runs?.count ?? 0) / PAGE_SIZE));
  const alertPages = Math.max(1, Math.ceil((alerts?.count ?? 0) / PAGE_SIZE));
  const findings = detail ? extractFindings(detail.summary) : [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <FinancialNav />
        <InsightHeader eyebrow="Financial controls" title="Audit monitoring"
          description="Inspect persistent internal reconciliation runs, alerts and permissions. No processor or bank settlement is verified here."
          backHref="/admin/financial" actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/finance" className="rounded-xl border border-white/25 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10">Current reconciliation</Link>
              {canRun && <button type="button" onClick={() => void runAudit()} disabled={running || queuedKey !== null}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"><Play size={14}/>{running ? "Queueing…" : queuedKey ? "Audit queued" : "Run manual audit"}</button>}
            </div>
          } />
        <div className="flex justify-end"><RetryButton onClick={refresh} disabled={loading || running} /></div>
        {loading && <p role="status" className="text-sm text-slate-500">Loading audit history…</p>}
        {error && <Notice variant="error">{error}. <button type="button" onClick={refresh} className="font-semibold underline">Try again</button></Notice>}
        {actionMessage && <p role="status" aria-live="polite" className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{actionMessage}</p>}
        {history && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Audit metrics">
              <Metric title="Audit runs" value={runs?.count.toLocaleString("en-US") ?? "0"} subtitle="Saved history" icon={<Activity size={19}/>} />
              <Metric title="Open alert types" value={alerts?.count.toLocaleString("en-US") ?? "0"} subtitle="Distinct active checks" icon={<AlertTriangle size={19}/>} />
              <Metric title="Latest status on this page" value={runs?.results[0]?.status ?? "—"} subtitle="Most recent displayed run" icon={<ShieldCheck size={19}/>} />
              <Metric title="Findings in latest displayed run" value={runs?.results[0] ? String(runs.results[0].findings_count) : "—"} subtitle="Overlapping findings possible" icon={<CheckCircle2 size={19}/>} />
            </section>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
              <Panel title="Audit history" subtitle="Open any saved run to see individual checks.">
                {runs?.results.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th scope="col" className="pb-3">Date</th><th scope="col" className="pb-3">Source</th><th scope="col" className="pb-3">Status</th><th scope="col" className="pb-3">Findings</th><th scope="col" className="pb-3 text-right">Details</th></tr></thead>
                      <tbody>{runs.results.map((run) => (
                        <tr key={run.id} className="border-b border-slate-100 text-slate-700">
                          <td className="py-4 text-xs">{readableDate(run.created_at)}</td>
                          <td className="py-4 capitalize">{run.source}</td>
                          <td className="py-4"><AuditStatus status={run.status}/></td>
                          <td className="py-4 font-semibold">{run.findings_count}</td>
                          <td className="py-4 text-right"><button type="button" aria-label={`Inspect audit ${run.id}`} onClick={() => inspectRun(run.id)} className="font-semibold text-cyan-700 hover:underline">Inspect</button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-slate-500">No saved audit runs. The Celery worker and Beat schedule must be configured for automated audits.</p>}
                <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((p) => p - 1); }}>Previous</button>
                    <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40" disabled={page >= totalPages || loading} onClick={() => { setLoading(true); setPage((p) => p + 1); }}>Next</button>
                  </div>
                </div>
              </Panel>
              <Panel title="Open financial alerts" subtitle="Active issues requiring investigation; does not include resolved alerts.">
                {alerts?.results.length ? (
                  <div className="space-y-3">
                    {alerts.results.map((alert) => (
                      <article key={alert.code} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <span className="break-words text-xs font-semibold capitalize text-amber-950">{alert.code.replaceAll("_", " ")}</span>
                          <span className="shrink-0 rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-950">{alert.findings_count}</span>
                        </div>
                        <p className="mt-2 text-xs text-amber-800">Last seen: {readableDate(alert.last_seen_at)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-800"><CheckCircle2 size={20}/><p className="mt-2 text-sm font-semibold">No open findings</p><p className="mt-1 text-xs">This does not verify external settlement.</p></div>
                )}
                <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>Alert page {alertPage} of {alertPages}</span>
                  <div className="flex gap-2">
                    <button type="button" disabled={alertPage <= 1 || loading} onClick={() => { setLoading(true); setAlertPage((p) => p - 1); }} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button>
                    <button type="button" disabled={alertPage >= alertPages || loading} onClick={() => { setLoading(true); setAlertPage((p) => p + 1); }} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button>
                  </div>
                </div>
              </Panel>
            </div>
            <Notice>Only database consistency is examined. &quot;Clean&quot; does not mean a bank or payment provider has independently reconciled funds.</Notice>
          </>
        )}
        {(detailLoading || detailError || detail) && (
          <Panel title="Selected audit run" extra={<button type="button" className="text-sm text-slate-600 underline" onClick={() => { setRequestedDetailId(null); setDetail(null); setDetailError(""); setDetailLoading(false); }}>Close</button>}>
            {detailLoading && <p role="status" className="text-sm text-slate-500">Loading run details…</p>}
            {detailError && <Notice variant="error">{detailError}</Notice>}
            {detail && <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600"><AuditStatus status={detail.status}/><span>Run #{detail.id}</span><Clock3 size={15}/><span>{readableDate(detail.finished_at)}</span></div>
              {detail.error && <Notice variant="error">Audit failed: {detail.error}</Notice>}
              {findings.length ? (
                <div className="overflow-x-auto"><table className="w-full min-w-[460px] text-left text-sm"><caption className="sr-only">Internal reconciliation checks</caption>
                  <thead><tr className="border-b border-slate-200 text-slate-500"><th scope="col" className="py-2">Check</th><th scope="col" className="py-2">Findings</th><th scope="col" className="py-2">Sample IDs</th></tr></thead>
                  <tbody>{findings.map((finding) => <tr className="border-b border-slate-100" key={finding.code}><td className="py-3 capitalize">{finding.code.replaceAll("_", " ")}</td><td className="py-3 font-semibold">{finding.count}</td><td className="py-3 text-xs text-slate-500">{finding.samples || "—"}</td></tr>)}</tbody>
                </table></div>
              ) : <p className="flex items-center gap-2 text-sm text-slate-500"><FileSearch size={16}/>No individual findings saved for this run.</p>}
              <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Show raw audit JSON</summary><pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(detail.summary, null, 2)}</pre></details>
            </div>}
          </Panel>
        )}
      </div>
    </main>
  );
}
