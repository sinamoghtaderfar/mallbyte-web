"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, FileSearch, Play, ShieldCheck, X } from "lucide-react";

import { Badge, type Tone } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, Notice } from "@/components/ui/states";
import { getMyPermissions } from "@/features/rbac/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { getApiErrorMessage } from "@/lib/api/errors";

import { findAuditRunByKey, getAuditHistory, getAuditRunDetail, startManualAudit } from "../api";
import { extractFindings } from "../finance-utils";
import type { AuditRunDetail } from "../types";
import { FinancialNav } from "./financial-nav";
import { DashboardSkeleton, readableDate, RefreshButton } from "./insight-kit";

const auditTones: Record<string, Tone> = { clean: "success", warnings: "warning", error: "danger", running: "info" };

function AuditStatus({ status }: { status: string }) {
  return <Badge tone={auditTones[status] ?? "neutral"} dot>{status}</Badge>;
}

type History = Awaited<ReturnType<typeof getAuditHistory>>;
const PAGE_SIZE = 10;

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
  const [requestedDetail, setRequestedDetail] = useState<{ id: number } | null>(null);

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
    if (requestedDetail == null) return;
    let active = true;
    void getAuditRunDetail(requestedDetail.id)
      .then((result) => { if (active) { setDetail(result); setDetailError(""); } })
      .catch((reason: unknown) => { if (active) { setDetail(null); setDetailError(getApiErrorMessage(reason)); } })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [requestedDetail]);

  function inspectRun(id: number) {
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    setRequestedDetail({ id });
  }

  const runs = history?.runs;
  const alerts = history?.alerts;
  const totalPages = Math.max(1, Math.ceil((runs?.count ?? 0) / PAGE_SIZE));
  const alertPages = Math.max(1, Math.ceil((alerts?.count ?? 0) / PAGE_SIZE));
  const findings = detail ? extractFindings(detail.summary) : [];

  function closeDetail() { setRequestedDetail(null); setDetail(null); setDetailError(""); setDetailLoading(false); }

  return (
    <main className="grid gap-6">
      <MonitoringHeader canRun={canRun} running={running} queued={queuedKey !== null} onRun={() => void runAudit()}
        refresh={<RefreshButton onClick={refresh} busy={loading && Boolean(history)} disabled={loading || running} />} />
      <FinancialNav />
      {error && <Notice tone="danger" title="Audit history unavailable" action={<Button size="small" variant="secondary" onClick={refresh}>Try again</Button>}>{error}</Notice>}
      {actionMessage && <p role="status" aria-live="polite" className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950"><Clock3 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />{actionMessage}</p>}
      {loading && !history && <DashboardSkeleton label="Loading audit history…" />}
      {loading && history && <p role="status" className="sr-only">Loading audit history…</p>}
      {history && (
        <>
          <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4" aria-label="Audit metrics">
            <StatCard label="Audit runs" value={runs?.count.toLocaleString("en-US") ?? "0"} hint="Saved history" icon={<Activity size={16} />} />
            <StatCard label="Open alert types" value={alerts?.count.toLocaleString("en-US") ?? "0"} hint="Distinct active checks" icon={<AlertTriangle size={16} />} tone={alerts?.count ? "brand" : "default"} />
            <StatCard label="Latest status on this page" value={runs?.results[0]?.status ?? "—"} hint="Most recent displayed run" icon={<ShieldCheck size={16} />} />
            <StatCard label="Findings in latest displayed run" value={runs?.results[0] ? String(runs.results[0].findings_count) : "—"} hint="Overlapping findings possible" icon={<CheckCircle2 size={16} />} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card padded={false} className="overflow-hidden">
              <CardHeader className="p-5 sm:p-6" title="Audit history" description="Open any saved run to see individual checks." />
              {runs?.results.length ? (
                <div className="overflow-x-auto border-t border-line">
                  <table className="mb-table min-w-[34rem]">
                    <thead><tr><th scope="col">Date</th><th scope="col">Source</th><th scope="col">Status</th><th scope="col" className="text-right">Findings</th><th scope="col" className="text-right">Details</th></tr></thead>
                    <tbody>{runs.results.map((run) => (
                      <tr key={run.id} className={requestedDetail?.id === run.id ? "[&>td]:!bg-ember-50/60" : ""}>
                        <td className="whitespace-nowrap text-muted">{readableDate(run.created_at)}</td>
                        <td className="capitalize">{run.source}</td>
                        <td><AuditStatus status={run.status} /></td>
                        <td className="text-right font-semibold" data-numeric>{run.findings_count}</td>
                        <td className="text-right"><Button size="small" variant="quiet" aria-label={`Inspect audit ${run.id}`} onClick={() => inspectRun(run.id)}>Inspect</Button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <EmptyState className="mx-5 mb-5 py-10" icon={<FileSearch size={22} />} title="No saved audit runs" description="The Celery worker and Beat schedule must be configured for automated audits." />}
              <Pagination className="border-t border-line px-5 py-3" label="Audit history pages" summary={`Page ${page} of ${totalPages}`}
                canPrevious={page > 1} canNext={page < totalPages} disabled={loading}
                onPrevious={() => { setLoading(true); setPage((p) => p - 1); }} onNext={() => { setLoading(true); setPage((p) => p + 1); }} />
            </Card>

            <Card padded={false} className="overflow-hidden">
              <CardHeader className="p-5 sm:p-6" title="Open financial alerts" description="Active issues requiring investigation; resolved alerts are excluded." />
              <div className="px-5 pb-5 sm:px-6">
                {alerts?.results.length ? (
                  <ul className="grid gap-2.5">
                    {alerts.results.map((alert) => (
                      <li key={alert.code} className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium capitalize text-amber-950 [overflow-wrap:anywhere]">{alert.code.replaceAll("_", " ")}</span>
                          <Badge tone="warning"><span data-numeric>{alert.findings_count}</span><span className="sr-only"> findings</span></Badge>
                        </div>
                        <p className="mt-1.5 text-xs text-amber-900">Last seen: {readableDate(alert.last_seen_at)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                    <CheckCircle2 size={20} className="shrink-0" aria-hidden="true" />
                    <div><p className="text-sm font-semibold">No open findings</p><p className="mt-0.5 text-xs">This does not verify external settlement.</p></div>
                  </div>
                )}
              </div>
              <Pagination className="border-t border-line px-5 py-3" label="Alert pages" summary={`Alert page ${alertPage} of ${alertPages}`}
                canPrevious={alertPage > 1} canNext={alertPage < alertPages} disabled={loading}
                onPrevious={() => { setLoading(true); setAlertPage((p) => p - 1); }} onNext={() => { setLoading(true); setAlertPage((p) => p + 1); }} />
            </Card>
          </div>
          <Notice tone="info">Only database consistency is examined. &quot;Clean&quot; does not mean a bank or payment provider has independently reconciled funds.</Notice>
        </>
      )}
      {(detailLoading || detailError || detail) && (
        <Card aria-labelledby="audit-detail-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="audit-detail-title" className="text-base font-semibold tracking-tight text-foreground">Selected audit run</h2>
              <p className="mt-1 text-sm text-muted">Individual internal reconciliation checks for this run.</p>
            </div>
            <Button size="small" variant="secondary" onClick={closeDetail}><X size={15} aria-hidden="true" />Close</Button>
          </div>
          <div className="mt-5 grid gap-5">
            {detailLoading && <p role="status" className="text-sm text-muted">Loading run details…</p>}
            {detailError && <Notice tone="danger" action={<Button size="small" variant="secondary" onClick={() => { if (requestedDetail) inspectRun(requestedDetail.id); }}>Retry audit details</Button>}>{detailError}</Notice>}
            {detail && <>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted"><AuditStatus status={detail.status} /><span className="font-medium text-foreground">Run #{detail.id}</span><span className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" />{readableDate(detail.finished_at)}</span></div>
              {detail.error && <Notice tone="danger">Audit failed: {detail.error}</Notice>}
              {findings.length ? (
                <div className="overflow-x-auto rounded-xl border border-line"><table className="mb-table min-w-[30rem]"><caption className="sr-only">Internal reconciliation checks</caption>
                  <thead><tr><th scope="col">Check</th><th scope="col" className="text-right">Findings</th><th scope="col">Sample IDs</th></tr></thead>
                  <tbody>{findings.map((finding) => <tr key={finding.code}><td className="capitalize">{finding.code.replaceAll("_", " ")}</td><td className="text-right font-semibold" data-numeric>{finding.count}</td><td className="font-mono text-xs text-muted">{finding.samples || "—"}</td></tr>)}</tbody>
                </table></div>
              ) : <p className="flex items-center gap-2 text-sm text-muted"><FileSearch size={16} aria-hidden="true" />No individual findings saved for this run.</p>}
              <details className="rounded-xl border border-line"><summary className="flex min-h-11 items-center px-4 text-sm font-medium text-slate-700 hover:text-foreground">Show raw audit JSON</summary><pre className="max-h-80 overflow-auto rounded-b-xl border-t border-line bg-ink p-4 font-mono text-xs leading-5 text-slate-100">{JSON.stringify(detail.summary, null, 2)}</pre></details>
            </>}
          </div>
        </Card>
      )}
    </main>
  );
}

function MonitoringHeader({ canRun, running, queued, onRun, refresh }: {
  canRun: boolean; running: boolean; queued: boolean; onRun: () => void; refresh: ReactNode;
}) {
  return (
    <PageHeader eyebrow="Financial controls" title="Audit monitoring"
      description="Inspect persistent internal reconciliation runs, alerts and permissions. No processor or bank settlement is verified here."
      actions={<>
        {refresh}
        <Link href="/admin/finance" className={buttonStyles({ variant: "secondary" })}>Current reconciliation</Link>
        {canRun && <Button onClick={onRun} disabled={running || queued} loading={running}>{!running && <Play size={15} aria-hidden="true" />}{running ? "Queueing…" : queued ? "Audit queued" : "Run manual audit"}</Button>}
      </>} />
  );
}
