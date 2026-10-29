"use client";

import {
    Activity, AlertCircle, AlertTriangle, ArrowRight,
    ClipboardList, Clock3, FileClock, RefreshCw,
    Shield, ShieldAlert, Timer, TrendingUp, Zap,
} from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
} from "recharts";
import { apiError, observabilityAPI } from "../api";
import type {
    AlertRow, AuditRow, ErrorRow, HealthHistory, HealthSnapshot, ListPage,
    Metrics, RequestRow, TaskRow, WindowKey,
} from "../types";
import { useObservabilityAccess } from "./access";

const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const actionButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50";
const field = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-600";
const windows: WindowKey[] = ["1h", "6h", "24h", "7d"];
type Tab = "overview" | "requests" | "errors" | "alerts" | "tasks" | "audit";

export function formatCount(value: number | null | undefined):string {
  return typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("en-US").format(value) : "—";
}
export function metricNumber(value: number | string | null | undefined, digits=1):string {
  const parsed = Number(value);
  return value !== undefined && value !== null && value !== "" && Number.isFinite(parsed) ? parsed.toFixed(digits) : "—";
}
export function dateLabel(value?:string|null):string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
function badgeColor(value:string):string {
  if (["healthy","success","succeeded","resolved","closed","acknowledged","200"].includes(value.toLowerCase())) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (["unhealthy","critical","error","failed","open"].includes(value.toLowerCase())) return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}
function Badge({value}:{value:string}) {return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${badgeColor(value)}`}>{value.replaceAll("_"," ")}</span>;}
function PanelTitle({title,description,children}:{title:string;description?:string;children?:ReactNode}) {return <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-950">{title}</h2>{description&&<p className="mt-1 text-xs text-slate-500">{description}</p>}</div>{children}</div>;}
function Empty({message="No records found."}:{message?:string}) {return <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">{message}</div>;}
function Pager({page,data,onChange}:{page:number;data:ListPage<unknown>|null;onChange:(page:number)=>void}) {
  if (!data) return null;
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
    <span>{formatCount(data.count)} records · Page {page}</span>
    <div className="flex gap-2"><button className={button} disabled={!data.previous} onClick={()=>onChange(Math.max(1,page-1))}>Previous</button><button className={button} disabled={!data.next} onClick={()=>onChange(page+1)}>Next</button></div>
  </div>;
}
function TableHead({labels}:{labels:string[]}) {return <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{labels.map(x=><th key={x} scope="col" className="whitespace-nowrap px-4 py-3">{x}</th>)}</tr></thead>;}
function MetricTile({label,value,unit,icon:Icon}:{label:string;value:string;unit?:string;icon:typeof Activity}) {return <div className={card}><div className="flex items-center justify-between text-xs font-medium text-slate-500"><span>{label}</span><Icon size={18} className="text-slate-400"/></div><div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}<span className="ml-1 text-sm font-medium text-slate-400">{unit}</span></div></div>;}
function ServicePill({label,status,latency}:{label:string;status?:string;latency?:number|string|null}) {return <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"><div className="flex items-center gap-2 text-sm font-medium text-slate-800"><span className={`h-2 w-2 rounded-full ${status==="healthy"?"bg-emerald-500":status==="unhealthy"?"bg-rose-500":"bg-amber-400"}`}/>{label}</div><div className="flex items-center gap-2"><span className="text-xs text-slate-500">{latency!=null?`${metricNumber(latency)} ms`:""}</span><Badge value={status||"unknown"}/></div></div>;}

export function ObservabilityDashboard() {
  const access = useObservabilityAccess();
  const [tab,setTab] = useState<Tab>("overview");
  const [windowKey,setWindowKey] = useState<WindowKey>("24h");
  const [tick,setTick] = useState(0);
  const [overviewLoading,setOverviewLoading] = useState(true);
  const [overviewError,setOverviewError] = useState("");
  const [health,setHealth] = useState<HealthSnapshot|null>(null);
  const [metrics,setMetrics] = useState<Metrics|null>(null);
  const [history,setHistory] = useState<HealthHistory[]>([]);
  const [page,setPage] = useState(1);
  const [listLoading,setListLoading] = useState(false);
  const [listError,setListError] = useState("");
  const [mutationError,setMutationError] = useState("");
  const [notice,setNotice] = useState("");
  const [mutating,setMutating] = useState<string|null>(null);
  const [alerts,setAlerts] = useState<ListPage<AlertRow>|null>(null);
  const [requests,setRequests] = useState<ListPage<RequestRow>|null>(null);
  const [errors,setErrors] = useState<ListPage<ErrorRow>|null>(null);
  const [tasks,setTasks] = useState<ListPage<TaskRow>|null>(null);
  const [audits,setAudits] = useState<ListPage<AuditRow>|null>(null);
  const [pathInput,setPathInput] = useState("");
  const [pathFilter,setPathFilter] = useState("");
  const [method,setMethod] = useState("");
  const [severity,setSeverity] = useState("");
  const [unresolvedOnly,setUnresolvedOnly] = useState(true);
  const [alertStatus,setAlertStatus] = useState("");
  const [taskStatus,setTaskStatus] = useState("");

  const tabOptions = useMemo(() => [
    {id:"overview" as Tab,label:"Overview",icon:Activity,allowed:true},
    {id:"requests" as Tab,label:"Requests",icon:TrendingUp,allowed:access.viewLogs},
    {id:"errors" as Tab,label:"Errors",icon:AlertCircle,allowed:access.viewLogs},
    {id:"alerts" as Tab,label:"Alerts",icon:ShieldAlert,allowed:true},
    {id:"tasks" as Tab,label:"Celery Tasks",icon:Zap,allowed:access.viewLogs},
    {id:"audit" as Tab,label:"Audit",icon:FileClock,allowed:access.viewAudit},
  ].filter(x=>x.allowed), [access.viewLogs,access.viewAudit]);
  const openTab=(value:Tab) => {setTab(value);setPage(1);setListError("");setMutationError("");setNotice("");};
  const refresh=()=>setTick(n=>n+1);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      const result=await Promise.allSettled([
        observabilityAPI.health(),observabilityAPI.metrics(windowKey),observabilityAPI.history(),
      ]);
      if(!active)return;
      if(result[0].status==="fulfilled") setHealth(result[0].value); else setHealth(null);
      if(result[1].status==="fulfilled") setMetrics(result[1].value); else setMetrics(null);
      if(result[2].status==="fulfilled") setHistory(result[2].value.results); else setHistory([]);
      const failed=result.filter(x=>x.status==="rejected") as PromiseRejectedResult[];
      setOverviewError(failed.length ? failed.map(x=>apiError(x.reason)).filter((x,i,a)=>a.indexOf(x)===i).join(" · ") : "");
      setOverviewLoading(false);
    };
    void load();return()=>{active=false;};
  },[tick,windowKey]);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      if(tab==="overview")return;
      setListLoading(true);
      try {
        const response=tab==="alerts" ? await observabilityAPI.alerts(page,alertStatus) :
          tab==="requests" ? await observabilityAPI.requests(page,pathFilter,method) :
          tab==="errors" ? await observabilityAPI.errors(page,severity,unresolvedOnly) :
          tab==="tasks" ? await observabilityAPI.tasks(page,taskStatus) :
          await observabilityAPI.audits(page);
        if(!active)return;
        if(tab==="alerts")setAlerts(response as ListPage<AlertRow>);
        if(tab==="requests")setRequests(response as ListPage<RequestRow>);
        if(tab==="errors")setErrors(response as ListPage<ErrorRow>);
        if(tab==="tasks")setTasks(response as ListPage<TaskRow>);
        if(tab==="audit")setAudits(response as ListPage<AuditRow>);
        setListError("");
      } catch(e:unknown) {if(active)setListError(apiError(e));}
      finally{if(active)setListLoading(false);}
    };
    void load();return()=>{active=false;};
  },[tab,page,tick,pathFilter,method,severity,unresolvedOnly,alertStatus,taskStatus]);

  // Poll overview and asynchronous task statuses; no timer is scheduled for unauthorized data.
  useEffect(()=>{
    const handle=window.setInterval(()=>setTick(x=>x+1),60000);
    return()=>window.clearInterval(handle);
  },[]);

  const mutate=useCallback(async(id:string,perform:()=>Promise<unknown>,message:string)=>{
    setMutationError("");setNotice("");setMutating(id);
    try{await perform();setNotice(message);setTick(x=>x+1);}catch(e:unknown){setMutationError(apiError(e));}
    finally{setMutating(null);}
  },[]);
  const recordAlertAction=(item:AlertRow,action:"acknowledge"|"resolve")=>{
    if(!window.confirm(`${action === "resolve" ? "Resolve" : "Acknowledge"} alert: ${item.title}?`))return;
    void mutate(item.id,()=>observabilityAPI.alertAction(item.id,action),`Alert ${action}d.`);
  };
  const recordErrorAction=(item:ErrorRow)=>{
    if(!window.confirm(`Mark error ${item.exception_type} as resolved?`))return;
    void mutate(item.id,()=>observabilityAPI.resolveError(item.id),"Error marked resolved.");
  };
  const createFromError=(item:ErrorRow)=>void mutate(item.id,()=>observabilityAPI.createIncidentFromError(item),"Incident created from this error. Open Incident Center to manage it.");
  const trend = useMemo(()=>metrics?.request_trend.map(item=>({
    time:dateLabel(item.bucket),requests:item.requests,average_ms:Number(item.average_ms||0),
  }))??[],[metrics]);
  const resourceTrend = useMemo(()=>[...history].reverse().map(item=>({
    time:new Date(item.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
    cpu:Number(item.cpu_percent||0), memory:Number(item.memory_percent||0),disk:Number(item.disk_percent||0),
  })),[history]);
  const selectedPage:ListPage<unknown>|null = tab==="requests"?requests:tab==="errors"?errors:tab==="alerts"?alerts:tab==="tasks"?tasks:tab==="audit"?audits:null;

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-lg sm:px-9">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">MallByte / Engineering Control Center</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Observability</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Production signals, API latency, reliability and incident response. Real data from the Django backend.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${health?.status==="healthy"&&!health?.is_stale?"bg-emerald-400":"bg-amber-400"}`}/>{health?.is_stale?"Stale snapshot":health?.status??"Unknown health"}</span><span>Snapshot: {dateLabel(health?.created_at)}</span></div>
          </div>
          <div className="flex flex-wrap gap-2"><Link href="/admin/observability/workflows" className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800"><ClipboardList size={16}/> Incident Center <ArrowRight size={15}/></Link>
            <button type="button" onClick={refresh} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100"><RefreshCw size={16}/> Refresh</button>
          </div>
        </div>
      </header>
      <nav aria-label="Observability sections" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabOptions.map(({id,label,icon:Icon})=><button key={id} type="button" aria-current={tab===id?"page":undefined} onClick={()=>openTab(id)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${tab===id?"bg-slate-950 text-white":"bg-white text-slate-600 hover:bg-slate-100"}`}><Icon size={16}/>{label}</button>)}
      </nav>
      {mutationError&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{mutationError}</div>}
      {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {tab==="overview"&&<div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Performance at a glance</h2><p className="text-xs text-slate-500">Stats reflect the selected window, system health reflects the latest snapshot.</p></div><div className="flex rounded-xl border border-slate-200 bg-white p-1" aria-label="Metrics time window">{windows.map(w=><button key={w} aria-pressed={windowKey===w} onClick={()=>setWindowKey(w)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${w===windowKey?"bg-slate-950 text-white":"text-slate-600 hover:bg-slate-50"}`}>{w}</button>)}</div></div>
        {overviewError&&<div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Some panels are unavailable: {overviewError}</div>}
        {overviewLoading&&<p role="status" className="text-sm text-slate-500">Loading live metrics…</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="API requests" value={metrics?formatCount(metrics.requests_count):"—"} icon={Activity}/>
          <MetricTile label="5xx error rate" value={metrics?metricNumber(metrics.error_rate_percent,2):"—"} unit="%" icon={AlertTriangle}/>
          <MetricTile label="Average response" value={metrics?metricNumber(metrics.average_duration_ms):"—"} unit="ms" icon={Clock3}/>
          <MetricTile label="P95 response" value={metrics?metricNumber(metrics.p95_duration_ms,0):"—"} unit="ms" icon={Timer}/>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <section className={card}><PanelTitle title="API traffic" description="Request volume over the selected period"/>
            {trend.length?<div className="h-64" role="img" aria-label="Requests per time bucket"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><CartesianGrid strokeDasharray="3 4" stroke="#e2e8f0"/><XAxis dataKey="time" tick={{fontSize:10}} minTickGap={40}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Area type="monotone" dataKey="requests" stroke="#0891b2" fill="#cffafe" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>:<Empty message="No request traffic recorded in this window."/>}
          </section>
          <section className={card}><PanelTitle title="Service health" description={health?.is_stale?"Warning: latest snapshot is stale":"Latest periodic health snapshot"}/>
            {health?<div className="space-y-2"><ServicePill label="PostgreSQL" status={health.database_status} latency={health.database_latency_ms}/><ServicePill label="Redis" status={health.redis_status} latency={health.redis_latency_ms}/><ServicePill label="Celery Worker" status={health.celery_status}/><ServicePill label="Celery Beat" status={health.celery_beat_status}/><div className="border-t border-slate-100 pt-3 text-xs text-slate-500">Host: {health.hostname||"—"} · {dateLabel(health.created_at)}</div></div>:<Empty message="No health snapshot is available yet."/>}
          </section>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <section className={card}><PanelTitle title="Host utilization" description="CPU, memory and disk from recent scheduled snapshots"/>
            {resourceTrend.length?<div className="h-64" role="img" aria-label="Host CPU memory and disk utilization"><ResponsiveContainer width="100%" height="100%"><AreaChart data={resourceTrend}><CartesianGrid strokeDasharray="3 4" stroke="#e2e8f0"/><XAxis dataKey="time" tick={{fontSize:11}}/><YAxis domain={[0,100]} unit="%" tick={{fontSize:11}}/><Tooltip/><Legend/><Area name="CPU" type="monotone" dataKey="cpu" stroke="#0891b2" fill="#a5f3fc" fillOpacity={0.35}/><Area name="RAM" type="monotone" dataKey="memory" stroke="#6366f1" fill="#c7d2fe" fillOpacity={0.2}/><Area name="Disk" type="monotone" dataKey="disk" stroke="#d97706" fill="#fde68a" fillOpacity={0.2}/></AreaChart></ResponsiveContainer></div>:<Empty message="No snapshot history available."/>}
          </section>
          <section className={card}><PanelTitle title="Operations summary" description="Counts are reported by the backend"/>
            <div className="space-y-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm text-slate-600"><AlertTriangle size={17}/> Open alerts</div><span className="text-xl font-semibold">{metrics?formatCount(metrics.open_alerts_count):"—"}</span></div><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm text-slate-600"><AlertCircle size={17}/> Error logs in window</div><span className="text-xl font-semibold">{metrics?formatCount(metrics.error_logs_count):"—"}</span></div><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm text-slate-600"><Clock3 size={17}/> Slow requests</div><span className="text-xl font-semibold">{metrics?formatCount(metrics.slow_requests_count):"—"}</span></div><button onClick={()=>openTab("alerts")} className={`${button} w-full`}>Review alerts <ArrowRight size={14}/></button></div>
          </section>
        </div>
        <section className={card}><PanelTitle title="Most requested paths" description="Top endpoints by request count"/>
          {metrics?.top_paths.length?<div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={metrics.top_paths.slice(0,8)} layout="vertical" margin={{left:15,right:25}}><CartesianGrid strokeDasharray="3 4" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis dataKey="path" type="category" width={200} tick={{fontSize:10}}/><Tooltip/><Bar dataKey="count" fill="#0891b2" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>:<Empty message="No endpoints to display."/>}
        </section>
      </div>}
      {tab!=="overview"&&<section className={card}>
        <PanelTitle title={{requests:"HTTP Request Logs",errors:"Error Tracking",alerts:"Observability Alerts",tasks:"Celery Task Logs",audit:"Audit Trail"}[tab]} description="Server-paginated results; access enforced by Django RBAC">
          <button onClick={refresh} className={button}><RefreshCw size={15}/> Refresh</button>
        </PanelTitle>
        {tab==="requests"&&<form onSubmit={(e:FormEvent)=>{e.preventDefault();setPage(1);setPathFilter(pathInput.trim());}} className="mb-4 flex flex-wrap gap-2"><input className={`${field} min-w-48 flex-1`} value={pathInput} onChange={e=>setPathInput(e.target.value)} placeholder="Filter endpoint path" aria-label="Filter request path"/><select aria-label="HTTP method" className={field} value={method} onChange={e=>{setPage(1);setMethod(e.target.value);}}><option value="">All methods</option>{["GET","POST","PUT","PATCH","DELETE"].map(x=><option key={x}>{x}</option>)}</select><button className={actionButton}>Apply filter</button></form>}
        {tab==="errors"&&<div className="mb-4 flex flex-wrap items-center gap-3"><select className={field} aria-label="Error severity" value={severity} onChange={e=>{setPage(1);setSeverity(e.target.value);}}><option value="">All severities</option>{["info","warning","error","critical"].map(x=><option key={x}>{x}</option>)}</select><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={unresolvedOnly} onChange={e=>{setPage(1);setUnresolvedOnly(e.target.checked);}}/>Unresolved only</label></div>}
        {tab==="alerts"&&<select className={`${field} mb-4`} aria-label="Alert status" value={alertStatus} onChange={e=>{setPage(1);setAlertStatus(e.target.value);}}><option value="">All alerts</option>{["open","acknowledged","resolved"].map(x=><option key={x}>{x}</option>)}</select>}
        {tab==="tasks"&&<select className={`${field} mb-4`} aria-label="Task status" value={taskStatus} onChange={e=>{setPage(1);setTaskStatus(e.target.value);}}><option value="">All tasks</option>{["started","success","failure","retry","revoked","unknown"].map(x=><option key={x}>{x}</option>)}</select>}
        {listError&&<div role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{listError}</div>}
        {listLoading&&<p role="status" className="mb-4 text-sm text-slate-500">Loading records…</p>}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          {tab==="requests"&&<table className="w-full min-w-[700px] text-sm"><TableHead labels={["Time","Method","Path","Status","Latency"]}/><tbody>{requests?.results.map(x=><tr key={x.id} className="border-b border-slate-100"><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dateLabel(x.created_at)}</td><td className="px-4 py-3 font-semibold">{x.method}</td><td className="max-w-sm break-all px-4 py-3 font-mono text-xs">{x.path}</td><td className="px-4 py-3"><Badge value={String(x.status_code)}/></td><td className="px-4 py-3 tabular-nums">{x.duration_ms} ms</td></tr>)}</tbody></table>}
          {tab==="errors"&&<table className="w-full min-w-[760px] text-sm"><TableHead labels={["Time","Exception / Endpoint","Severity","State","Action"]}/><tbody>{errors?.results.map(x=><tr key={x.id} className="border-b border-slate-100"><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dateLabel(x.created_at)}</td><td className="max-w-sm px-4 py-3"><div className="font-semibold">{x.exception_type}</div><p className="mt-1 break-all font-mono text-xs text-slate-500">{x.status_code} · {x.path}</p>{access.viewSensitive&&x.message&&<p className="mt-2 break-words text-xs text-slate-600">{x.message.slice(0,200)}</p>}</td><td className="px-4 py-3"><Badge value={x.severity}/></td><td className="px-4 py-3"><Badge value={x.is_resolved?"resolved":"open"}/></td><td className="px-4 py-3"><div className="flex flex-col gap-2">{access.createIncidents&&<button className={button} disabled={!!mutating} onClick={()=>createFromError(x)}>Create incident</button>}{access.resolveErrors&&!x.is_resolved&&<button className={button} disabled={!!mutating} onClick={()=>recordErrorAction(x)}>Resolve error</button>}</div></td></tr>)}</tbody></table>}
          {tab==="alerts"&&<table className="w-full min-w-[760px] text-sm"><TableHead labels={["Time","Alert","Severity","Status","Action"]}/><tbody>{alerts?.results.map(x=><tr key={x.id} className="border-b border-slate-100"><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dateLabel(x.created_at)}</td><td className="max-w-md px-4 py-3"><div className="font-semibold">{x.title}</div><p className="mt-1 text-xs text-slate-500">{x.message.slice(0,240)}</p></td><td className="px-4 py-3"><Badge value={x.severity}/></td><td className="px-4 py-3"><Badge value={x.status}/></td><td className="px-4 py-3"><div className="flex flex-wrap gap-2">{access.manageAlerts&&x.status==="open"&&<button className={button} disabled={!!mutating} onClick={()=>recordAlertAction(x,"acknowledge")}>Acknowledge</button>}{access.manageAlerts&&x.status!=="resolved"&&<button className={button} disabled={!!mutating} onClick={()=>recordAlertAction(x,"resolve")}>Resolve</button>}</div></td></tr>)}</tbody></table>}
          {tab==="tasks"&&<table className="w-full min-w-[700px] text-sm"><TableHead labels={["Created","Task","Status","Duration"]}/><tbody>{tasks?.results.map(x=><tr key={x.id} className="border-b border-slate-100"><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dateLabel(x.created_at)}</td><td className="max-w-lg break-all px-4 py-3 font-mono text-xs">{x.task_name}{x.error_message&&access.viewSensitive&&<p className="mt-1 text-rose-700">{x.error_message.slice(0,200)}</p>}</td><td className="px-4 py-3"><Badge value={x.status}/></td><td className="px-4 py-3">{x.duration_ms == null?"—":`${x.duration_ms} ms`}</td></tr>)}</tbody></table>}
          {tab==="audit"&&<table className="w-full min-w-[700px] text-sm"><TableHead labels={["Time","Actor","Action","Object / Description"]}/><tbody>{audits?.results.map(x=><tr key={x.id} className="border-b border-slate-100"><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dateLabel(x.created_at)}</td><td className="px-4 py-3">{x.actor_display||"System"}</td><td className="px-4 py-3"><Badge value={x.action}/></td><td className="max-w-md px-4 py-3"><div className="text-xs font-medium">{x.object_type} {x.object_id}</div><p className="mt-1 text-xs text-slate-500">{x.description}</p></td></tr>)}</tbody></table>}
        </div>
        {!selectedPage?.results.length&&!listLoading&&!listError&&<Empty/>}
        <Pager page={page} data={selectedPage} onChange={setPage}/>
      </section>}
      <footer className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500"><Shield size={16}/> Only authorized data is requested; Backend RBAC is authoritative. AI recommendations require human verification. The Host Runner handles separately approved restarts.</footer>
    </div>
  </main>;
}
