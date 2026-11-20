"use client";

import { useAuthStore } from "@/features/auth/auth-store";
import { Activity, AlertTriangle, Bot, CheckCircle2, ClipboardList, RefreshCw, ServerCog, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import { Badge, type Tone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { StatCard } from "@/components/ui/card";
import { controlStyles } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { errorText, workflowAPI } from "../api";
import type { AIDiagnosis, Incident, IncidentEvent, InfrastructureOperation } from "../types";
import { useWorkflowAccess } from "./route";

const field = controlStyles;
const primary = buttonStyles();
const secondary = buttonStyles({ variant: "secondary", size: "small" });
const panel = "mb-card min-w-0 p-5 sm:p-6";

function date(iso: string) { return new Date(iso).toLocaleString(); }
function chip(value: string) {
  const tone: Tone = value === "critical" || value === "failed" || value === "rejected" ? "danger"
    : value === "approved" || value === "resolved" || value === "closed" || value === "succeeded" ? "success"
    : "warning";
  return <Badge tone={tone} dot className="capitalize">{value.replaceAll("_", " ")}</Badge>;
}

export function WorkflowWorkbench() {
  const access = useWorkflowAccess();
  const currentUserId = useAuthStore(s => s.user?.id);
  const [tab, setTab] = useState<"incidents" | "operations">(access.viewIncidents ? "incidents" : "operations");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [operations, setOperations] = useState<InfrastructureOperation[]>([]);
  const [incidentPage, setIncidentPage] = useState(1);
  const [operationPage, setOperationPage] = useState(1);
  const [incidentNext, setIncidentNext] = useState(false);
  const [operationNext, setOperationNext] = useState(false);
  const [incidentCount, setIncidentCount] = useState(0);
  const [operationCount, setOperationCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [diagnoses, setDiagnoses] = useState<AIDiagnosis[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [sourceError, setSourceError] = useState("");
  const [sourceAlert, setSourceAlert] = useState("");
  const [assignee, setAssignee] = useState("");
  const [nextState, setNextState] = useState("investigating");
  const [note, setNote] = useState("");
  const [includeDescription, setIncludeDescription] = useState(false);
  const [aiConsent, setAIConsent] = useState(false);
  const [opTarget, setOpTarget] = useState("celery_worker");
  const [opReason, setOpReason] = useState("");

  // Keep fetching separate from state updates so the initial effect never invokes
  // a state-setting callback synchronously. The same fetch is reused by Refresh.
  const fetchLists = useCallback(() => Promise.all([
    access.viewIncidents ? workflowAPI.listIncidents(incidentPage) : Promise.resolve(null),
    access.viewOps ? workflowAPI.listOperations(operationPage) : Promise.resolve(null),
  ]), [access.viewIncidents, access.viewOps, incidentPage, operationPage]);

  const applyLists = useCallback((results: Awaited<ReturnType<typeof fetchLists>>) => {
    setIncidents(results[0]?.results ?? []);
    setOperations(results[1]?.results ?? []);
    setIncidentNext(Boolean(results[0]?.next));
    setOperationNext(Boolean(results[1]?.next));
    setIncidentCount(results[0]?.count ?? 0);
    setOperationCount(results[1]?.count ?? 0);
  }, []);

  const refresh = useCallback(async () => {
    applyLists(await fetchLists());
  }, [fetchLists, applyLists]);

  useEffect(() => {
    let live = true;
    void fetchLists()
      .then((results) => { if (live) applyLists(results); })
      .catch((e: unknown) => { if (live) setError(errorText(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [fetchLists, applyLists]);

  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    if (access.manageIncidents) {
      void workflowAPI.incidentEvents(selectedId)
        .then((items) => { if (live) setEvents(items); }).catch(() => { if (live) setEvents([]); });
    }
    if (access.requestAI) {
      void workflowAPI.diagnoses(selectedId)
        .then((items) => { if (live) setDiagnoses(items); }).catch(() => { if (live) setDiagnoses([]); });
    }
    return () => { live = false; };
  }, [selectedId, access.manageIncidents, access.requestAI, incidents]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setWorking(true); setError(""); setMessage("");
    try {
      await action(); await refresh(); setMessage(success);
    } catch (e: unknown) { setError(errorText(e)); }
    finally { setWorking(false); }
  };

  const selected = incidents.find((item) => item.id === selectedId);
  const transitions:Record<string,string[]> = {
    open: ["investigating", "closed"],
    investigating: ["mitigated", "resolved"],
    mitigated: ["investigating", "resolved"],
    resolved: ["closed", "investigating"],
    closed: ["investigating"],
  };
  const validNext = transitions[selected?.status || "open"] || [];
  const effectiveNext = validNext.includes(nextState) ? nextState : validNext[0];
  const stats = [
    { label: "Open incidents", value: incidents.filter((x) => x.status !== "closed" && x.status !== "resolved").length, icon: AlertTriangle },
    { label: "Critical incidents", value: incidents.filter((x) => x.severity === "critical" && x.status !== "closed").length, icon: Activity },
    { label: "Pending approvals", value: operations.filter((x) => x.status === "pending").length, icon: ShieldCheck },
  ];

  return <main className="grid gap-6">
      <PageHeader eyebrow="Observability" title="Incident & Operations Center"
        crumbs={[{ href: "/admin/observability", label: "Observability" }, { label: "Ops workflows" }]}
        description="Track incidents, request AI-assisted diagnosis and review tightly controlled infrastructure operations."
        actions={<button type="button" onClick={() => void run(refresh, "Data refreshed.")} disabled={working} className={buttonStyles({ variant: "secondary" })}><RefreshCw size={16} aria-hidden="true"/> Refresh</button>} />
      <section aria-label="Workflow summary" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:gap-4">{stats.map(({ label, value, icon: Icon }) =>
        <StatCard key={label} label={label} value={value} icon={<Icon size={16}/>} />)}</section>
      {error && <Notice tone="danger">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      <SegmentedNav label="Workflow sections" value={tab} onChange={setTab} items={[
        ...(access.viewIncidents ? [{ id: "incidents" as const, label: "Incidents", icon: ClipboardList }] : []),
        ...(access.viewOps ? [{ id: "operations" as const, label: "Operations", icon: ServerCog }] : []),
      ]} />
      {loading ? <div role="status" className="grid gap-5 lg:grid-cols-2"><span className="sr-only">Loading live records…</span><Skeleton className="h-80 rounded-2xl"/><Skeleton className="h-80 rounded-2xl"/></div> : tab === "incidents" ? <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="space-y-4">
          {access.createIncidents && <form className={`${panel} space-y-3`} onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault(); void run(async () => { await workflowAPI.createIncident({ title, description, severity, ...(sourceError ? { source_error: sourceError } : {}), ...(sourceAlert ? { source_alert: sourceAlert } : {}) }); setTitle(""); setDescription(""); setSourceError(""); setSourceAlert(""); }, "Incident created.");
          }}>
            <h2 className="text-base font-semibold tracking-tight text-foreground">Create incident</h2>
            <input className={field} required minLength={5} maxLength={180} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short incident title" aria-label="Incident title"/>
            <textarea className={`${field} min-h-24`} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What happened? Avoid personal or secret data." aria-label="Incident description"/>
            <select className={field} value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity">{["low","medium","high","critical"].map((x) => <option key={x} value={x}>{x}</option>)}</select>
            <input className={field} value={sourceError} onChange={(e) => setSourceError(e.target.value.trim())} placeholder="Related ErrorLog UUID (optional)" aria-label="Related ErrorLog UUID"/>
            <input className={field} value={sourceAlert} onChange={(e) => setSourceAlert(e.target.value.trim())} placeholder="Related Alert UUID (optional)" aria-label="Related Alert UUID"/>
            <button className={primary} disabled={working} type="submit">Create incident</button>
          </form>}
          <div className={panel}>
            <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">Recent incidents</h2>
            {incidents.length === 0 ? <EmptyState className="py-10" title="No incidents yet" description="Incidents created here or from error tracking appear in this list." /> :
              <div className="space-y-2">{incidents.map((x) => <button key={x.id} onClick={() => setSelectedId(x.id)}
                aria-pressed={x.id === selectedId} className={`w-full rounded-xl border p-3.5 text-left transition-colors ${x.id === selectedId ? "border-ember-300 bg-ember-50/70 ring-1 ring-ember-200" : "border-line hover:border-line-strong hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium text-foreground">{x.title || `Incident ${x.id.slice(0,8)}`}</span>{chip(x.severity)}</div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted"><span className="capitalize">{x.status}</span><span>{date(x.created_at)}</span></div>
              </button>)}</div>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm text-muted"><span data-numeric>{incidentCount} incidents · Page {incidentPage}</span><div className="flex gap-2"><button className={secondary} disabled={working || incidentPage<=1} onClick={()=>{setSelectedId(null);setIncidentPage(n=>n-1);}}>Previous</button><button className={secondary} disabled={working || !incidentNext} onClick={()=>{setSelectedId(null);setIncidentPage(n=>n+1);}}>Next</button></div></div>
          </div>
        </section>
        <section aria-label="Selected incident" className={`${panel} space-y-5 lg:sticky lg:top-24`}>
          {!selected ? <EmptyState className="border-0 bg-transparent py-16" icon={<ClipboardList size={24}/>} title="No incident selected" description="Select an incident to inspect and manage it." /> : <>
            <div><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold tracking-tight text-foreground">{selected.title || `Incident ${selected.id.slice(0,8)}`}</h2>{chip(selected.status)}</div>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-700">{selected.description ?? "Detailed incident notes require operator access."}</p>
              <p className="mt-2 text-xs text-muted">Assigned user ID: {selected.assigned_to ?? "Unassigned"}</p></div>
            {access.assignIncidents && <form className="flex flex-wrap gap-2" onSubmit={(e) => {
              e.preventDefault(); void run(() => workflowAPI.assign(selected.id, Number(assignee)), "Incident assigned.");
            }}><input type="number" min={1} className={`${field} max-w-44 flex-1`} placeholder="Staff user ID" aria-label="Assignee user ID" required value={assignee} onChange={(e) => setAssignee(e.target.value)}/>
              <button className={secondary} type="submit" disabled={working}>Assign</button></form>}
            {access.manageIncidents && <form className="space-y-2 border-t border-line pt-5" onSubmit={(e) => {
              e.preventDefault(); void run(() => workflowAPI.transition(selected.id, effectiveNext, note), "Incident status updated.");
            }}><h3 className="text-sm font-semibold text-foreground">Update status</h3><select className={field} value={effectiveNext} onChange={(e) => setNextState(e.target.value)} aria-label="Next incident status">
              {validNext.map((s) => <option key={s}>{s}</option>)}
            </select><textarea className={field} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} minLength={effectiveNext === "resolved" ? 10 : undefined} placeholder="Reason or resolution note (10+ chars for Resolve)"/>
              <button className={secondary} type="submit" disabled={working}>Save status</button></form>}
            {access.manageIncidents && <div className="border-t border-line pt-5"><h3 className="mb-3 text-sm font-semibold text-foreground">Timeline</h3>
              {events.length === 0 ? <p className="text-sm text-muted">No events recorded yet.</p> : <ol className="max-h-56 space-y-3 overflow-auto border-l border-line pl-4">{events.map((x) => <li key={x.id} className="relative text-sm"><span aria-hidden="true" className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-slate-300 ring-4 ring-surface"/><p className="text-slate-700"><span className="font-medium capitalize text-foreground">{x.event_type.replaceAll("_", " ")}</span>{x.note ? ` · ${x.note}` : ""}</p><p className="mt-0.5 text-xs text-muted">{date(x.created_at)}</p></li>)}</ol>}
              <button className={`${secondary} mt-3`} disabled={working || note.trim().length < 2} onClick={() => void run(() => workflowAPI.comment(selected.id, note), "Comment saved.")}>Add note as comment</button>
            </div>}
            {access.requestAI && <div className="space-y-3 border-t border-line pt-5"><div className="flex items-center gap-2"><Bot size={18} className="text-brand" aria-hidden="true"/><h3 className="text-sm font-semibold text-foreground">AI-assisted diagnosis</h3></div>
              <p className="text-xs leading-5 text-muted">AI provides unverified hypotheses, not a confirmed root cause. Only explicit, privacy-reviewed evidence is sent to the external provider. Runs asynchronously in Celery.</p>
              {!selected.source_error && !includeDescription && <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">This incident has no linked Error Log. To request AI analysis, first verify the incident title and description contain no secrets or personal data, then explicitly enable sending the description below. Without real evidence, the server rejects the request rather than guessing.</p>}
              <label className="flex items-start gap-2.5 rounded-xl border border-line p-3 text-xs leading-5 text-slate-700"><input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={aiConsent} onChange={(e) => setAIConsent(e.target.checked)}/>
                I consent to sending sanitized technical incident metadata to the external AI provider for this request.</label>
              <label className="flex items-start gap-2.5 rounded-xl border border-line p-3 text-xs leading-5 text-slate-700"><input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={includeDescription} onChange={(e) => setIncludeDescription(e.target.checked)}/>
                I explicitly agree to send the incident title and description to the configured external AI provider (redacted, but may still contain personal data).</label>
              <button className={primary} disabled={working || !aiConsent || (!selected.source_error && !includeDescription)} onClick={() => void run(async () => {
                await workflowAPI.diagnose(selected.id, includeDescription);
                setDiagnoses(await workflowAPI.diagnoses(selected.id));
              }, "AI diagnosis queued. Refresh to see the result; review suggestions before acting.")}>Request diagnosis</button>
              {diagnoses.map((x) => <article key={x.id} className="rounded-xl border border-line bg-sunken/50 p-4"><p className="text-xs text-muted">{x.status} · {x.model_name} · {date(x.created_at)}</p>
                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-foreground">{x.response || "Waiting for the Celery worker…"}</p></article>)}
            </div>}
          </>}
        </section>
      </div> : <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {access.requestOps && <form className={`${panel} space-y-3`} onSubmit={(e) => {
          e.preventDefault(); void run(async () => { await workflowAPI.requestOperation(opTarget, opReason); setOpReason(""); }, "Restart request submitted. A different administrator must approve it.");
        }}><h2 className="text-base font-semibold tracking-tight text-foreground">Request a controlled restart</h2>
          <p className="text-sm leading-6 text-muted">No restart occurs when this form is submitted. A second person must approve it, then a trusted host runner executes it.</p>
          <select className={field} aria-label="Service target" value={opTarget} onChange={(e) => setOpTarget(e.target.value)}>
            <option value="celery_worker">Celery Worker</option><option value="celery_beat">Celery Beat</option>
          </select><textarea className={`${field} min-h-28`} rows={4} maxLength={1000} minLength={15} required value={opReason} onChange={(e) => setOpReason(e.target.value)} placeholder="Describe failed checks and the operational reason (15+ chars)."/>
          <button className={primary} disabled={working} type="submit">Submit request</button>
        </form>}
        <section className={`${panel} space-y-3`}>
          <div className="flex items-center gap-2"><ServerCog size={18} className="text-slate-500" aria-hidden="true"/><h2 className="text-base font-semibold tracking-tight text-foreground">Infrastructure operation requests</h2></div>
          {operations.length === 0 ? <EmptyState className="py-10" title="No requests" description="Controlled restart requests appear here for second-person approval." /> : operations.map((op) => <article key={op.id} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium capitalize text-foreground">{op.target.replaceAll("_", " ")}</span>{chip(op.status)}</div>
            <p className="mt-2 text-sm whitespace-pre-wrap text-slate-700">{op.reason}</p>
            <p className="mt-2 text-xs text-muted">Requester: {op.requested_by ?? "—"} · Approver: {op.approved_by ?? "—"} · Expires: {date(op.expires_at)}</p>
            {op.status === "pending" && access.approveOps && op.requested_by === currentUserId && <p className="mt-2 text-xs text-amber-800">A separate administrator must approve this request.</p>}
            {op.result_message && <p className="mt-2 text-sm text-slate-700"><CheckCircle2 className="mr-1 inline" size={14}/>{op.result_message}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {op.status === "pending" && access.approveOps && op.requested_by !== currentUserId && <>
                <button disabled={working} className={secondary} onClick={() => void run(() => workflowAPI.operationAction(op.id,"approve"), "Operation approved. The host timer will execute it if installed and enabled.")}>Approve</button>
                <button disabled={working} className={secondary} onClick={() => void run(() => workflowAPI.operationAction(op.id,"reject"), "Operation rejected.")}>Reject</button>
              </>}
              {(op.status === "pending" || op.status === "approved") && (access.approveOps || access.requestOps) && <button disabled={working} className={secondary}
                onClick={() => void run(() => workflowAPI.operationAction(op.id,"cancel"), "Request cancelled.")}>Cancel</button>}
            </div>
          </article>)}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm text-muted"><span data-numeric>{operationCount} operations · Page {operationPage}</span><div className="flex gap-2"><button className={secondary} disabled={working || operationPage<=1} onClick={()=>setOperationPage(n=>n-1)}>Previous</button><button className={secondary} disabled={working || !operationNext} onClick={()=>setOperationPage(n=>n+1)}>Next</button></div></div><p className="text-xs text-muted">Operations are audited, limited by target and never execute inside the web process.</p>
        </section>
      </div>}
      <p className="text-xs leading-5 text-muted">Access is enforced by Django RBAC on every API request. AI output is advisory, not an automated fix. Celery restarts are dispatched by the independently installed host timer after second-person approval. Redis requires manual runbook steps.</p>
  </main>;
}
