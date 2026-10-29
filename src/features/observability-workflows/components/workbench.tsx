"use client";

import { useAuthStore } from "@/features/auth/auth-store";
import { Activity, AlertTriangle, Bot, CheckCircle2, ClipboardList, RefreshCw, ServerCog, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { errorText, workflowAPI } from "../api";
import type { AIDiagnosis, Incident, IncidentEvent, InfrastructureOperation } from "../types";
import { useWorkflowAccess } from "./route";

const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-cyan-600";
const primary = "rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50";

function date(iso: string) { return new Date(iso).toLocaleString(); }
function chip(value: string) {
  const tint = value === "critical" || value === "failed" || value === "rejected" ? "bg-rose-100 text-rose-800"
    : value === "approved" || value === "resolved" || value === "closed" || value === "succeeded" ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-900";
  return <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold capitalize ${tint}`}>{value.replaceAll("_", " ")}</span>;
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

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-[2rem] bg-slate-950 px-7 py-9 text-white sm:px-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">MallByte / Observability</p>
            <h1 className="mt-3 text-3xl font-semibold">Incident & Operations Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Track incidents, request AI-assisted diagnosis and review tightly controlled infrastructure operations.</p>
          </div>
          <button onClick={() => void run(refresh, "Data refreshed.")} disabled={working} className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm"><RefreshCw size={16}/> Refresh</button>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">{stats.map(({ label, value, icon: Icon }) =>
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500"><span>{label}</span><Icon size={18}/></div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
        </div>)}</div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {access.viewIncidents && <button className={tab === "incidents" ? primary : secondary} onClick={() => setTab("incidents")}><ClipboardList className="mr-2 inline" size={15}/>Incidents</button>}
        {access.viewOps && <button className={tab === "operations" ? primary : secondary} onClick={() => setTab("operations")}><ServerCog className="mr-2 inline" size={15}/>Operations</button>}
      </div>
      {loading ? <p className="p-8 text-slate-500">Loading live records…</p> : tab === "incidents" ? <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="space-y-4">
          {access.createIncidents && <form className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault(); void run(async () => { await workflowAPI.createIncident({ title, description, severity, ...(sourceError ? { source_error: sourceError } : {}), ...(sourceAlert ? { source_alert: sourceAlert } : {}) }); setTitle(""); setDescription(""); setSourceError(""); setSourceAlert(""); }, "Incident created.");
          }}>
            <h2 className="font-semibold text-slate-950">Create incident</h2>
            <input className={field} required minLength={5} maxLength={180} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short incident title" aria-label="Incident title"/>
            <textarea className={field} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What happened? Avoid personal or secret data." aria-label="Incident description"/>
            <select className={field} value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity">{["low","medium","high","critical"].map((x) => <option key={x} value={x}>{x}</option>)}</select>
            <input className={field} value={sourceError} onChange={(e) => setSourceError(e.target.value.trim())} placeholder="Related ErrorLog UUID (optional)" aria-label="Related ErrorLog UUID"/>
            <input className={field} value={sourceAlert} onChange={(e) => setSourceAlert(e.target.value.trim())} placeholder="Related Alert UUID (optional)" aria-label="Related Alert UUID"/>
            <button className={primary} disabled={working} type="submit">Create incident</button>
          </form>}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-950">Recent incidents</h2>
            {incidents.length === 0 ? <p className="text-sm text-slate-500">No incidents yet.</p> :
              <div className="space-y-2">{incidents.map((x) => <button key={x.id} onClick={() => setSelectedId(x.id)}
                className={`w-full rounded-xl border p-3 text-left hover:border-cyan-500 ${x.id === selectedId ? "border-cyan-600 bg-cyan-50" : "border-slate-200"}`}>
                <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-900">{x.title || `Incident ${x.id.slice(0,8)}`}</span>{chip(x.severity)}</div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500"><span>{x.status}</span><span>{date(x.created_at)}</span></div>
              </button>)}</div>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>{incidentCount} incidents · Page {incidentPage}</span><div className="flex gap-2"><button className={secondary} disabled={working || incidentPage<=1} onClick={()=>{setSelectedId(null);setIncidentPage(n=>n-1);}}>Previous</button><button className={secondary} disabled={working || !incidentNext} onClick={()=>{setSelectedId(null);setIncidentPage(n=>n+1);}}>Next</button></div></div>
          </div>
        </section>
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selected ? <div className="py-14 text-center text-sm text-slate-500">Select an incident to inspect and manage it.</div> : <>
            <div><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-slate-950">{selected.title || `Incident ${selected.id.slice(0,8)}`}</h2>{chip(selected.status)}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.description ?? "Detailed incident notes require operator access."}</p>
              <p className="mt-2 text-xs text-slate-400">Assigned user ID: {selected.assigned_to ?? "Unassigned"}</p></div>
            {access.assignIncidents && <form className="flex flex-wrap gap-2" onSubmit={(e) => {
              e.preventDefault(); void run(() => workflowAPI.assign(selected.id, Number(assignee)), "Incident assigned.");
            }}><input type="number" min={1} className={`${field} max-w-44`} placeholder="Staff user ID" aria-label="Assignee user ID" required value={assignee} onChange={(e) => setAssignee(e.target.value)}/>
              <button className={secondary} type="submit" disabled={working}>Assign</button></form>}
            {access.manageIncidents && <form className="space-y-2 border-t border-slate-100 pt-4" onSubmit={(e) => {
              e.preventDefault(); void run(() => workflowAPI.transition(selected.id, effectiveNext, note), "Incident status updated.");
            }}><h3 className="text-sm font-semibold">Update status</h3><select className={field} value={effectiveNext} onChange={(e) => setNextState(e.target.value)} aria-label="Next incident status">
              {validNext.map((s) => <option key={s}>{s}</option>)}
            </select><textarea className={field} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} minLength={effectiveNext === "resolved" ? 10 : undefined} placeholder="Reason or resolution note (10+ chars for Resolve)"/>
              <button className={secondary} type="submit" disabled={working}>Save status</button></form>}
            {access.manageIncidents && <div className="border-t border-slate-100 pt-4"><h3 className="mb-2 text-sm font-semibold">Timeline</h3>
              <div className="max-h-44 space-y-2 overflow-auto">{events.map((x) => <p key={x.id} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{x.event_type} · {x.note} <span className="text-slate-400">{date(x.created_at)}</span></p>)}</div>
              <button className={`${secondary} mt-3`} disabled={working || note.trim().length < 2} onClick={() => void run(() => workflowAPI.comment(selected.id, note), "Comment saved.")}>Add note as comment</button>
            </div>}
            {access.requestAI && <div className="space-y-3 border-t border-slate-100 pt-4"><div className="flex items-center gap-2"><Bot size={20}/><h3 className="font-semibold">AI-assisted diagnosis</h3></div>
              <p className="text-xs text-slate-500">AI provides unverified hypotheses, not a confirmed root cause. Only explicit, privacy-reviewed evidence is sent to the external provider. Runs asynchronously in Celery.</p>
              {!selected.source_error && !includeDescription && <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">This incident has no linked Error Log. To request AI analysis, first verify the incident title and description contain no secrets or personal data, then explicitly enable sending the description below. Without real evidence, the server rejects the request rather than guessing.</p>}
              <label className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={aiConsent} onChange={(e) => setAIConsent(e.target.checked)}/>
                I consent to sending sanitized technical incident metadata to the external AI provider for this request.</label>
              <label className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={includeDescription} onChange={(e) => setIncludeDescription(e.target.checked)}/>
                I explicitly agree to send the incident title and description to the configured external AI provider (redacted, but may still contain personal data).</label>
              <button className={primary} disabled={working || !aiConsent || (!selected.source_error && !includeDescription)} onClick={() => void run(async () => {
                await workflowAPI.diagnose(selected.id, includeDescription);
                setDiagnoses(await workflowAPI.diagnoses(selected.id));
              }, "AI diagnosis queued. Refresh to see the result; review suggestions before acting.")}>Request diagnosis</button>
              {diagnoses.map((x) => <article key={x.id} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{x.status} · {x.model_name} · {date(x.created_at)}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{x.response || "Waiting for the Celery worker…"}</p></article>)}
            </div>}
          </>}
        </section>
      </div> : <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        {access.requestOps && <form className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={(e) => {
          e.preventDefault(); void run(async () => { await workflowAPI.requestOperation(opTarget, opReason); setOpReason(""); }, "Restart request submitted. A different administrator must approve it.");
        }}><h2 className="font-semibold">Request a controlled restart</h2>
          <p className="text-sm leading-6 text-slate-500">No restart occurs when this form is submitted. A second person must approve it, then a trusted host runner executes it.</p>
          <select className={field} aria-label="Service target" value={opTarget} onChange={(e) => setOpTarget(e.target.value)}>
            <option value="celery_worker">Celery Worker</option><option value="celery_beat">Celery Beat</option>
          </select><textarea className={field} rows={4} maxLength={1000} minLength={15} required value={opReason} onChange={(e) => setOpReason(e.target.value)} placeholder="Describe failed checks and the operational reason (15+ chars)."/>
          <button className={primary} disabled={working} type="submit">Submit request</button>
        </form>}
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><ServerCog size={19}/><h2 className="font-semibold">Infrastructure operation requests</h2></div>
          {operations.length === 0 ? <p className="text-sm text-slate-500">No requests.</p> : operations.map((op) => <article key={op.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-slate-900">{op.target.replaceAll("_", " ")}</span>{chip(op.status)}</div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{op.reason}</p>
            <p className="mt-2 text-xs text-slate-500">Requester: {op.requested_by ?? "—"} · Approver: {op.approved_by ?? "—"} · Expires: {date(op.expires_at)}</p>
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
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>{operationCount} operations · Page {operationPage}</span><div className="flex gap-2"><button className={secondary} disabled={working || operationPage<=1} onClick={()=>setOperationPage(n=>n-1)}>Previous</button><button className={secondary} disabled={working || !operationNext} onClick={()=>setOperationPage(n=>n+1)}>Next</button></div></div><p className="text-xs text-slate-400">Operations are audited, limited by target and never execute inside the web process.</p>
        </section>
      </div>}
      <footer className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">Access is enforced by Django RBAC on every API request. AI output is advisory, not an automated fix. Celery restarts are dispatched by the independently installed host timer after second-person approval. Redis requires manual runbook steps.</footer>
    </div>
  </main>;
}
