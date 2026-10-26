"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, CheckCircle2, Clock3, ExternalLink, Play,
  ShieldCheck, XCircle,
} from "lucide-react";

import { getMyPermissions } from "@/features/rbac/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  findAuditRunByKey, getAuditHistory, getAuditRunDetail, startManualAudit,
} from "../api";
import type { AuditRunDetail } from "../types";
import {
  InsightHeader, Metric, Notice, Panel, readableDate, RetryButton,
} from "./insight-kit";

type History = Awaited<ReturnType<typeof getAuditHistory>>;
const PAGE_SIZE = 10;

function AuditStatus({ status }: { status: string }) {
  const styles: Record<string, string> = {
    clean: "bg-emerald-50 text-emerald-700",
    warnings: "bg-amber-50 text-amber-700",
    error: "bg-rose-50 text-rose-700",
    running: "bg-sky-50 text-sky-700",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

export function FinancialMonitoring() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canRun, setCanRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [queuedKey, setQueuedKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [detail, setDetail] = useState<AuditRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let active = true;
    void getAuditHistory(page, PAGE_SIZE)
      .then((result) => { if (active) { setHistory(result); setError(""); } })
      .catch((reason: unknown) => { if (active) setError(getApiErrorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision]);

  useEffect(() => {
    let active = true;
    void getMyPermissions()
      .then((result) => {
        if (active) setCanRun(result.permissions.includes("manage_analytics_reports"));
      })
      .catch(() => { if (active) setCanRun(false); });
    return () => { active = false; };
  }, []);

  function refresh() {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }

  async function runAudit() {
    if (!canRun || running) return;
    setRunning(true);
    setActionMessage("");
    setError("");
    try {
      const job = await startManualAudit();
      setActionMessage(`Audit queued. Job ID: ${job.task_id}. Checking worker result…`);
      setQueuedKey(job.run_key);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setRunning(false);
    }
  }


  // The POST queues a Celery task. It does NOT mean reconciliation completed.
  useEffect(() => {
    if (!queuedKey) return;
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function check() {
      try {
        const result = await findAuditRunByKey(queuedKey!);
        if (!active) return;
        if (result && result.status !== "running") {
          setActionMessage(`Audit #${result.id} completed: ${result.status}.`);
          setQueuedKey(null);
          setPage(1);
          setLoading(true);
          setRevision((v) => v + 1);
          return;
        }
      } catch (reason) {
        if (!active) return;
        setActionMessage(`Audit queued; could not check status: ${getApiErrorMessage(reason)}`);
      }
      attempts += 1;
      if (attempts < 15) {
        timeout = setTimeout(() => { void check(); }, 2000);
      } else {
        setActionMessage("Audit is queued or still processing. Refresh the history later.");
        setQueuedKey(null);
      }
    }
    void check();
    return () => { active = false; if (timeout) clearTimeout(timeout); };
  }, [queuedKey]);

  async function inspectRun(id: number) {
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    try {
      setDetail(await getAuditRunDetail(id));
    } catch (reason) {
      setDetailError(getApiErrorMessage(reason));
    } finally {
      setDetailLoading(false);
    }
  }

  const runs = history?.runs;
  const alerts = history?.alerts;
  const totalPages = Math.max(1, Math.ceil((runs?.count ?? 0) / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <InsightHeader eyebrow="Financial controls" title="Audit monitoring"
          description="Historical database reconciliation runs, active findings and operational checks. This is not bank reconciliation."
          backHref="/admin" actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/finance" className="rounded-xl border border-white/25 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10">Current reconciliation</Link>
              {canRun && <button type="button" onClick={() => void runAudit()} disabled={running || queuedKey !== null}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                <Play size={14} /> {running ? "Queueing…" : queuedKey ? "Audit queued" : "Run manual audit"}
              </button>}
            </div>
          } />
        <div className="flex justify-end"><RetryButton onClick={refresh} disabled={loading || running} /></div>
        {loading && <p role="status" className="text-sm text-slate-500">Loading audit history…</p>}
        {error && <Notice variant="error">{error}. <button onClick={refresh} className="font-semibold underline">Try again</button></Notice>}
        {actionMessage && <Notice>{actionMessage}</Notice>}

        {history && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Audit metrics">
              <Metric title="Audit runs" value={runs?.count.toLocaleString("en-US") ?? "0"} subtitle="Saved history" icon={<Activity size={19} />} />
              <Metric title="Open alert types" value={alerts?.count.toLocaleString("en-US") ?? "0"} subtitle="Deduplicated reconciliation checks" icon={<AlertTriangle size={19} />} />
              <Metric title="Most recent status" value={page === 1 ? (runs?.results[0]?.status ?? "—") : "—"} subtitle="Latest run on first page" icon={<ShieldCheck size={19} />} />
              <Metric title="Most recent findings" value={page === 1 ? String(runs?.results[0]?.findings_count ?? 0) : "—"} subtitle="Number of detected mismatches" icon={<CheckCircle2 size={19} />} />
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
              <Panel title="Audit history" subtitle="Select any run to inspect its stored result.">
                {runs?.results.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="pb-3">Date</th><th className="pb-3">Source</th><th className="pb-3">Status</th><th className="pb-3">Findings</th><th className="pb-3 text-right">Details</th></tr></thead>
                      <tbody>{runs.results.map((run) => (
                        <tr key={run.id} className="border-b border-slate-100 text-slate-700">
                          <td className="py-4 text-xs">{readableDate(run.created_at)}</td>
                          <td className="py-4 capitalize">{run.source}</td>
                          <td className="py-4"><AuditStatus status={run.status} /></td>
                          <td className="py-4 font-semibold">{run.findings_count}</td>
                          <td className="py-4 text-right"><button type="button" onClick={() => void inspectRun(run.id)} className="inline-flex items-center gap-1 font-semibold text-cyan-700 hover:underline">Inspect <ExternalLink size={13} /></button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-slate-500">No audit runs recorded yet. Configure Celery Beat or run a manual audit if permitted.</p>}
                <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((p) => p - 1); }}>Previous</button>
                    <button className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40" disabled={page >= totalPages || loading} onClick={() => { setLoading(true); setPage((p) => p + 1); }}>Next</button>
                  </div>
                </div>
              </Panel>

              <Panel title="Open financial alerts" subtitle="Active checks requiring investigation.">
                {alerts?.results.length ? (
                  <div className="space-y-3">
                    {alerts.results.map((alert) => (
                      <article key={alert.code} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <span className="break-all text-xs font-semibold text-amber-950">{alert.code.replaceAll("_", " ")}</span>
                          <span className="shrink-0 rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-950">{alert.findings_count}</span>
                        </div>
                        <p className="mt-2 text-xs text-amber-800">Last seen: {readableDate(alert.last_seen_at)}</p>
                      </article>
                    ))}
                    {(alerts.count > alerts.results.length) && <p className="text-xs text-slate-500">Showing the first {alerts.results.length} of {alerts.count} alert types.</p>}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-800">
                    <CheckCircle2 size={20} />
                    <p className="mt-2 text-sm font-semibold">No open findings</p>
                    <p className="mt-1 text-xs">This does not prove external bank settlement.</p>
                  </div>
                )}
              </Panel>
            </div>
            <Notice>Audit reports are snapshots of internal database consistency. A clean status does not verify provider transactions, transfers or bank statements. Scheduled checks require an operational Celery worker and Beat.</Notice>
          </>
        )}

        {(detailLoading || detailError || detail) && (
          <Panel title="Selected audit run" extra={<button type="button" className="text-sm text-slate-500 underline" onClick={() => { setDetail(null); setDetailError(""); }}>Close details</button>}>
            {detailLoading && <p role="status" className="text-sm text-slate-500">Loading details…</p>}
            {detailError && <Notice variant="error">{detailError}</Notice>}
            {detail && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3"><AuditStatus status={detail.status} /><span className="text-sm text-slate-600">Run #{detail.id}</span><span className="text-sm text-slate-500"><Clock3 size={14} className="mr-1 inline" />{readableDate(detail.finished_at)}</span></div>
                {detail.error && <Notice variant="error"><XCircle size={15} className="mr-1 inline" />{detail.error}</Notice>}
                <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-5 text-xs leading-6 text-slate-200">{JSON.stringify(detail.summary, null, 2)}</pre>
              </div>
            )}
          </Panel>
        )}
      </div>
    </main>
  );
}
