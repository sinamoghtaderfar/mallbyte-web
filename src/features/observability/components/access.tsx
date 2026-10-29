"use client";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "@/features/auth/components/access-denied";
import { getMyPermissions } from "@/features/rbac/api";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { ObsAccess } from "../types";

const EMPTY:ObsAccess = {view:false,viewLogs:false,viewSensitive:false,viewAudit:false,manageAlerts:false,resolveErrors:false,viewIncidents:false,createIncidents:false,viewOps:false};
const Context = createContext<ObsAccess>(EMPTY);
export const useObservabilityAccess = () => useContext(Context);
export function ObservabilityRoute({children}:{children:ReactNode}) {
  const id = useAuthStore(s => s.user?.id);
  const authenticated = useAuthStore(s => s.isAuthenticated);
  const bootstrapped = useAuthStore(s => s.isBootstrapped);
  const authLoading = useAuthStore(s => s.isLoading);
  const [current, setCurrent] = useState<{id:number;access:ObsAccess}|null>(null);
  const [error,setError] = useState(false);
  const [retry,setRetry] = useState(0);
  useEffect(() => {
    if (!bootstrapped || !authenticated || id == null) return;
    let active=true;
    void getMyPermissions().then(r => {
      if (!active) return;
      const p = new Set(r.user_id === id ? r.permissions : []);
      const has = (code:string) => p.has(code);
      setCurrent({id,access:{
        view:has("view_observability"),
        viewLogs:has("view_observability_logs"),
        viewSensitive:has("view_observability_error_details"),
        viewAudit:has("view_observability_audit_logs"),
        manageAlerts:has("manage_observability_alerts"),
        resolveErrors:has("resolve_observability_errors"),
        viewIncidents:has("view_observability_incidents"),
        createIncidents:has("create_observability_incidents"),
        viewOps:has("view_observability_operations"),
      }});
      setError(false);
    }).catch(() => { if (active) {setError(true);setCurrent(null);} });
    return () => {active=false;};
  },[bootstrapped,authenticated,id,retry]);
  if (!bootstrapped || authLoading) return <p role="status" className="mx-auto max-w-7xl p-10 text-slate-500">Checking your session…</p>;
  if (!authenticated || id==null) return <AccessDenied description="Sign in to open Observability." />;
  if (error) return <main role="alert" className="mx-auto max-w-3xl p-10"><p>Cannot verify Observability permissions.</p><button onClick={()=>setRetry(n=>n+1)} className="mt-4 rounded-lg border px-4 py-2">Retry</button></main>;
  if (current?.id !== id) return <p role="status" className="mx-auto max-w-7xl p-10 text-slate-500">Loading Observability permissions…</p>;
  if (!current.access.view) return <AccessDenied description="Your account does not have view_observability permission." />;
  // A keyed subtree prevents records fetched for a previous account leaking across sessions.
  return <Context.Provider value={current.access}><div key={id}>{children}</div></Context.Provider>;
}
