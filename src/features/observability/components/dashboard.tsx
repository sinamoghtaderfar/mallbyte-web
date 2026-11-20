"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertCircle, AlertTriangle, ArrowRight,
  ClipboardList, Clock3, FileClock, RefreshCw,
  Shield, ShieldAlert, Timer, TrendingUp, Zap,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

import { Badge as UiBadge, type Tone } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { CHART_COLORS, chartTick, chartTooltipStyle, ToggleGroup } from "@/features/insights/components/insight-kit";

import { apiError, observabilityAPI } from "../api";
import type {
  AlertRow, AuditRow, ErrorRow, HealthHistory, HealthSnapshot, ListPage,
  Metrics, RequestRow, TaskRow, WindowKey,
} from "../types";
import { useObservabilityAccess } from "./access";

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
function toneFor(value:string): Tone {
  const v = value.toLowerCase();
  if (["healthy","success","succeeded","resolved","closed","acknowledged","200"].includes(v)) return "success";
  if (["unhealthy","critical","error","failed","failure","open"].includes(v)) return "danger";
  if (/^2\d\d$/.test(v)) return "success";
  if (/^5\d\d$/.test(v)) return "danger";
  return "warning";
}
function Badge({value}:{value:string}) {
  return <UiBadge tone={toneFor(value)} dot className="capitalize">{value.replaceAll("_"," ")}</UiBadge>;
}
function Empty({message="No records found."}:{message?:string}) {
  return <div className="rounded-xl border border-dashed border-line-strong bg-sunken/40 px-6 py-10 text-center text-sm text-muted">{message}</div>;
}
function TableHead({labels,numeric=[]}:{labels:string[];numeric?:string[]}) {
  return <thead><tr>{labels.map(x=><th key={x} scope="col" className={numeric.includes(x)?"text-right":""}>{x}</th>)}</tr></thead>;
}
function ServicePill({label,status,latency}:{label:string;status?:string;latency?:number|string|null}) {
  return <li className="flex items-center justify-between gap-3 rounded-xl border border-line bg-sunken/40 px-3.5 py-3">
    <span className="text-sm font-medium text-foreground">{label}</span>
    <span className="flex items-center gap-2.5">
      {latency!=null&&<span className="text-xs text-muted" data-numeric>{metricNumber(latency)} ms</span>}
      <Badge value={status||"unknown"}/>
    </span>
  </li>;
}
function OpsRow({icon:Icon,label,value}:{icon:typeof Activity;label:string;value:string}) {
  return <div className="flex items-center justify-between gap-3 py-3 first:pt-0">
    <span className="flex items-center gap-2.5 text-sm text-muted"><Icon size={16} aria-hidden="true"/>{label}</span>
    <span className="text-lg font-semibold tracking-tight text-foreground" data-numeric>{value}</span>
  </div>;
}

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

  const healthy = health?.status === "healthy" && !health?.is_stale;
  const listTitle = {requests:"HTTP Request Logs",errors:"Error Tracking",alerts:"Observability Alerts",tasks:"Celery Task Logs",audit:"Audit Trail"} as const;

  return <main className="grid gap-6">
    <PageHeader eyebrow="Engineering control center" title="Observability"
      description="Production signals, API latency, reliability and incident response. Real data from the Django backend."
      actions={<>
        <Link href="/admin/observability/workflows" className={buttonStyles({variant:"secondary"})}><ClipboardList size={16} aria-hidden="true"/> Incident Center <ArrowRight size={15} aria-hidden="true"/></Link>
        <Button onClick={refresh}><RefreshCw size={16} aria-hidden="true"/> Refresh</Button>
      </>}/>

    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-sm ${healthy?"border-emerald-200 bg-emerald-50/70 text-emerald-950":"border-amber-200 bg-amber-50/70 text-amber-950"}`}>
      <span className="flex items-center gap-2 font-medium"><span aria-hidden="true" className={`size-2 rounded-full ${healthy?"bg-emerald-500":"bg-amber-500"}`}/>{health?.is_stale?"Stale snapshot":health?.status??"Unknown health"}</span>
      <span className="text-xs opacity-80">Snapshot: {dateLabel(health?.created_at)}</span>
    </div>

    <SegmentedNav label="Observability sections" value={tab} onChange={openTab}
      items={tabOptions.map(({id,label,icon})=>({id,label,icon}))}/>

    {mutationError&&<Notice tone="danger">{mutationError}</Notice>}
    {notice&&<Notice tone="success">{notice}</Notice>}

    {tab==="overview"&&<div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-base font-semibold tracking-tight text-foreground">Performance at a glance</h2><p className="mt-1 text-sm text-muted">Stats reflect the selected window; system health reflects the latest snapshot.</p></div>
        <ToggleGroup label="Metrics time window" value={windowKey} onChange={setWindowKey} options={windows.map(w=>({id:w,label:w}))}/>
      </div>
      {overviewError&&<div role="alert" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true"/><p>Some panels are unavailable: {overviewError}</p></div>}
      {overviewLoading&&<p role="status" className="sr-only">Loading live metrics…</p>}
      <section aria-label="Key metrics" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {overviewLoading&&!metrics ? [0,1,2,3].map(i=><Skeleton key={i} className="h-[7.5rem] rounded-2xl"/>) : <>
          <StatCard label="API requests" value={metrics?formatCount(metrics.requests_count):"—"} icon={<Activity size={16}/>}/>
          <StatCard label="5xx error rate" value={<>{metrics?metricNumber(metrics.error_rate_percent,2):"—"}<span className="ml-1 text-sm font-medium text-muted">%</span></>} icon={<AlertTriangle size={16}/>}/>
          <StatCard label="Average response" value={<>{metrics?metricNumber(metrics.average_duration_ms):"—"}<span className="ml-1 text-sm font-medium text-muted">ms</span></>} icon={<Clock3 size={16}/>}/>
          <StatCard label="P95 response" value={<>{metrics?metricNumber(metrics.p95_duration_ms,0):"—"}<span className="ml-1 text-sm font-medium text-muted">ms</span></>} icon={<Timer size={16}/>}/>
        </>}
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card><CardHeader title="API traffic" description="Request volume over the selected period"/>
          <div className="mt-5">{trend.length?<div className="h-64 min-w-0" role="img" aria-label="Requests per time bucket"><ResponsiveContainer width="100%" height="100%" minHeight={220}><AreaChart data={trend} margin={{top:8,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke={CHART_COLORS.grid}/><XAxis dataKey="time" tick={chartTick} tickLine={false} axisLine={{stroke:CHART_COLORS.grid}} minTickGap={40}/><YAxis allowDecimals={false} tick={chartTick} tickLine={false} axisLine={false} width={44}/><Tooltip contentStyle={chartTooltipStyle}/><Area type="monotone" dataKey="requests" stroke={CHART_COLORS.ember} fill={CHART_COLORS.emberSoft} fillOpacity={0.45} strokeWidth={2} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div>:<Empty message="No request traffic recorded in this window."/>}</div>
        </Card>
        <Card><CardHeader title="Service health" description={health?.is_stale?"Warning: latest snapshot is stale":"Latest periodic health snapshot"}/>
          <div className="mt-5">{health?<><ul className="grid gap-2"><ServicePill label="PostgreSQL" status={health.database_status} latency={health.database_latency_ms}/><ServicePill label="Redis" status={health.redis_status} latency={health.redis_latency_ms}/><ServicePill label="Celery Worker" status={health.celery_status}/><ServicePill label="Celery Beat" status={health.celery_beat_status}/></ul><p className="mt-4 border-t border-line pt-3 text-xs text-muted">Host: <span className="font-mono">{health.hostname||"—"}</span> · {dateLabel(health.created_at)}</p></>:<Empty message="No health snapshot is available yet."/>}</div>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card><CardHeader title="Host utilization" description="CPU, memory and disk from recent scheduled snapshots"/>
          <div className="mt-5">{resourceTrend.length?<div className="h-64 min-w-0" role="img" aria-label="Host CPU memory and disk utilization"><ResponsiveContainer width="100%" height="100%" minHeight={220}><AreaChart data={resourceTrend} margin={{top:8,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke={CHART_COLORS.grid}/><XAxis dataKey="time" tick={chartTick} tickLine={false} axisLine={{stroke:CHART_COLORS.grid}}/><YAxis domain={[0,100]} unit="%" tick={chartTick} tickLine={false} axisLine={false} width={44}/><Tooltip contentStyle={chartTooltipStyle}/><Legend iconType="plainline" wrapperStyle={{fontSize:12}}/><Area name="CPU" type="monotone" dataKey="cpu" stroke={CHART_COLORS.ember} fill={CHART_COLORS.emberSoft} fillOpacity={0.3} isAnimationActive={false}/><Area name="RAM" type="monotone" dataKey="memory" stroke={CHART_COLORS.ink} strokeDasharray="5 4" fill="transparent" isAnimationActive={false}/><Area name="Disk" type="monotone" dataKey="disk" stroke={CHART_COLORS.neutral} strokeDasharray="2 3" fill="transparent" isAnimationActive={false}/></AreaChart></ResponsiveContainer></div>:<Empty message="No snapshot history available."/>}</div>
        </Card>
        <Card><CardHeader title="Operations summary" description="Counts are reported by the backend"/>
          <div className="mt-5 divide-y divide-line">
            <OpsRow icon={AlertTriangle} label="Open alerts" value={metrics?formatCount(metrics.open_alerts_count):"—"}/>
            <OpsRow icon={AlertCircle} label="Error logs in window" value={metrics?formatCount(metrics.error_logs_count):"—"}/>
            <OpsRow icon={Clock3} label="Slow requests" value={metrics?formatCount(metrics.slow_requests_count):"—"}/>
          </div>
          <Button variant="secondary" className="mt-4 w-full" onClick={()=>openTab("alerts")}>Review alerts <ArrowRight size={14} aria-hidden="true"/></Button>
        </Card>
      </div>
      <Card><CardHeader title="Most requested paths" description="Top endpoints by request count"/>
        <div className="mt-5">{metrics?.top_paths.length?<div className="h-72 min-w-0"><ResponsiveContainer width="100%" height="100%" minHeight={240}><BarChart data={metrics.top_paths.slice(0,8)} layout="vertical" margin={{left:8,right:24}}><CartesianGrid strokeDasharray="3 4" horizontal={false} stroke={CHART_COLORS.grid}/><XAxis type="number" allowDecimals={false} tick={chartTick} tickLine={false} axisLine={false}/><YAxis dataKey="path" type="category" width={180} tick={{...chartTick,fontSize:10}} tickLine={false} axisLine={false}/><Tooltip contentStyle={chartTooltipStyle} cursor={{fill:"rgb(18 18 17 / 0.04)"}}/><Bar dataKey="count" fill={CHART_COLORS.ember} radius={[0,4,4,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>:<Empty message="No endpoints to display."/>}</div>
      </Card>
    </div>}

    {tab!=="overview"&&<Card padded={false} className="overflow-hidden">
      <div className="grid gap-4 p-5 sm:p-6">
        <CardHeader title={listTitle[tab]} description="Server-paginated results; access enforced by Django RBAC"
          action={<Button size="small" variant="secondary" onClick={refresh}><RefreshCw size={15} aria-hidden="true"/> Refresh</Button>}/>
        {tab==="requests"&&<form onSubmit={(e:FormEvent)=>{e.preventDefault();setPage(1);setPathFilter(pathInput.trim());}} className="flex flex-col gap-2 sm:flex-row"><Input className="min-w-0 flex-1 font-mono" value={pathInput} onChange={e=>setPathInput(e.target.value)} placeholder="Filter endpoint path" aria-label="Filter request path"/><Select aria-label="HTTP method" className="sm:w-40" value={method} onChange={e=>{setPage(1);setMethod(e.target.value);}}><option value="">All methods</option>{["GET","POST","PUT","PATCH","DELETE"].map(x=><option key={x}>{x}</option>)}</Select><Button type="submit">Apply filter</Button></form>}
        {tab==="errors"&&<div className="flex flex-wrap items-center gap-3"><Select className="w-48" aria-label="Error severity" value={severity} onChange={e=>{setPage(1);setSeverity(e.target.value);}}><option value="">All severities</option>{["info","warning","error","critical"].map(x=><option key={x}>{x}</option>)}</Select><label className="flex min-h-11 items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="size-4" checked={unresolvedOnly} onChange={e=>{setPage(1);setUnresolvedOnly(e.target.checked);}}/>Unresolved only</label></div>}
        {tab==="alerts"&&<Select className="w-48" aria-label="Alert status" value={alertStatus} onChange={e=>{setPage(1);setAlertStatus(e.target.value);}}><option value="">All alerts</option>{["open","acknowledged","resolved"].map(x=><option key={x}>{x}</option>)}</Select>}
        {tab==="tasks"&&<Select className="w-48" aria-label="Task status" value={taskStatus} onChange={e=>{setPage(1);setTaskStatus(e.target.value);}}><option value="">All tasks</option>{["started","success","failure","retry","revoked","unknown"].map(x=><option key={x}>{x}</option>)}</Select>}
        {listError&&<Notice tone="danger">{listError}</Notice>}
        {listLoading&&<p role="status" className="text-sm text-muted">Loading records…</p>}
      </div>
      <div className="overflow-x-auto border-t border-line">
        {tab==="requests"&&<table className="mb-table min-w-[44rem]"><TableHead labels={["Time","Method","Path","Status","Latency"]} numeric={["Latency"]}/><tbody>{requests?.results.map(x=><tr key={x.id}><td className="whitespace-nowrap text-xs text-muted">{dateLabel(x.created_at)}</td><td><span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">{x.method}</span></td><td className="max-w-sm font-mono text-xs break-all">{x.path}</td><td><Badge value={String(x.status_code)}/></td><td className="text-right whitespace-nowrap" data-numeric>{x.duration_ms} ms</td></tr>)}</tbody></table>}
        {tab==="errors"&&<table className="mb-table min-w-[48rem]"><TableHead labels={["Time","Exception / Endpoint","Severity","State","Action"]}/><tbody>{errors?.results.map(x=><tr key={x.id}><td className="whitespace-nowrap text-xs text-muted">{dateLabel(x.created_at)}</td><td className="max-w-sm"><div className="font-medium text-foreground">{x.exception_type}</div><p className="mt-1 font-mono text-xs break-all text-muted">{x.status_code} · {x.path}</p>{access.viewSensitive&&x.message&&<p className="mt-2 text-xs break-words text-slate-600">{x.message.slice(0,200)}</p>}</td><td><Badge value={x.severity}/></td><td><Badge value={x.is_resolved?"resolved":"open"}/></td><td><div className="flex flex-col items-start gap-2">{access.createIncidents&&<Button size="small" variant="secondary" disabled={!!mutating} onClick={()=>createFromError(x)}>Create incident</Button>}{access.resolveErrors&&!x.is_resolved&&<Button size="small" variant="secondary" disabled={!!mutating} onClick={()=>recordErrorAction(x)}>Resolve error</Button>}</div></td></tr>)}</tbody></table>}
        {tab==="alerts"&&<table className="mb-table min-w-[48rem]"><TableHead labels={["Time","Alert","Severity","Status","Action"]}/><tbody>{alerts?.results.map(x=><tr key={x.id}><td className="whitespace-nowrap text-xs text-muted">{dateLabel(x.created_at)}</td><td className="max-w-md"><div className="font-medium text-foreground">{x.title}</div><p className="mt-1 text-xs text-muted">{x.message.slice(0,240)}</p></td><td><Badge value={x.severity}/></td><td><Badge value={x.status}/></td><td><div className="flex flex-wrap gap-2">{access.manageAlerts&&x.status==="open"&&<Button size="small" variant="secondary" disabled={!!mutating} onClick={()=>recordAlertAction(x,"acknowledge")}>Acknowledge</Button>}{access.manageAlerts&&x.status!=="resolved"&&<Button size="small" variant="secondary" disabled={!!mutating} onClick={()=>recordAlertAction(x,"resolve")}>Resolve</Button>}</div></td></tr>)}</tbody></table>}
        {tab==="tasks"&&<table className="mb-table min-w-[44rem]"><TableHead labels={["Created","Task","Status","Duration"]} numeric={["Duration"]}/><tbody>{tasks?.results.map(x=><tr key={x.id}><td className="whitespace-nowrap text-xs text-muted">{dateLabel(x.created_at)}</td><td className="max-w-lg font-mono text-xs break-all">{x.task_name}{x.error_message&&access.viewSensitive&&<p className="mt-1 text-rose-700">{x.error_message.slice(0,200)}</p>}</td><td><Badge value={x.status}/></td><td className="text-right whitespace-nowrap" data-numeric>{x.duration_ms == null?"—":`${x.duration_ms} ms`}</td></tr>)}</tbody></table>}
        {tab==="audit"&&<table className="mb-table min-w-[44rem]"><TableHead labels={["Time","Actor","Action","Object / Description"]}/><tbody>{audits?.results.map(x=><tr key={x.id}><td className="whitespace-nowrap text-xs text-muted">{dateLabel(x.created_at)}</td><td>{x.actor_display||"System"}</td><td><Badge value={x.action}/></td><td className="max-w-md"><div className="text-xs font-medium text-foreground">{x.object_type} {x.object_id}</div><p className="mt-1 text-xs text-muted">{x.description}</p></td></tr>)}</tbody></table>}
      </div>
      {!selectedPage?.results.length&&!listLoading&&!listError&&<div className="p-5 pt-0"><EmptyState className="py-10" title="No records found." description="Try a different filter or time window."/></div>}
      {selectedPage&&<Pagination className="border-t border-line px-5 py-3" label={`${listTitle[tab]} pages`} summary={`${formatCount(selectedPage.count)} records · Page ${page}`}
        canPrevious={Boolean(selectedPage.previous)} canNext={Boolean(selectedPage.next)}
        onPrevious={()=>setPage(Math.max(1,page-1))} onNext={()=>setPage(page+1)}/>}
    </Card>}

    <p className="flex items-start gap-2 text-xs leading-5 text-muted"><Shield size={15} className="mt-0.5 shrink-0" aria-hidden="true"/> Only authorized data is requested; Backend RBAC is authoritative. AI recommendations require human verification. The Host Runner handles separately approved restarts.</p>
  </main>;
}

