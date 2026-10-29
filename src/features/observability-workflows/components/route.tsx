"use client";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "@/features/auth/components/access-denied";
import { getMyPermissions } from "@/features/rbac/api";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { WorkflowAccess } from "../types";

const EMPTY: WorkflowAccess = {
  viewIncidents: false, createIncidents: false, assignIncidents: false,
  manageIncidents: false, requestAI: false, viewOps: false,
  requestOps: false, approveOps: false,
};
const Context = createContext<WorkflowAccess>(EMPTY);
export const useWorkflowAccess = () => useContext(Context);

export function WorkflowRoute({ children }: { children: ReactNode }) {
  const id = useAuthStore((s) => s.user?.id);
  const loggedIn = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.isBootstrapped);
  const loading = useAuthStore((s) => s.isLoading);
  const [gate, setGate] = useState<{ id: number; access: WorkflowAccess } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!bootstrapped || !loggedIn || id == null) return;
    let active = true;
    void getMyPermissions().then((result) => {
      if (!active) return;
      const p = new Set(result.user_id === id ? result.permissions : []);
      const has = (code: string) => p.has(code);
      setGate({ id, access: {
        viewIncidents: has("view_observability_incidents"),
        createIncidents: has("create_observability_incidents"),
        assignIncidents: has("assign_observability_incidents"),
        manageIncidents: has("manage_observability_incidents"),
        requestAI: has("request_observability_ai_diagnosis"),
        viewOps: has("view_observability_operations"),
        requestOps: has("request_observability_operations"),
        approveOps: has("approve_observability_operations"),
      }});
      setError(false);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [bootstrapped, loggedIn, id, retry]);

  if (!bootstrapped || loading) return <p className="p-10 text-slate-500" role="status">Checking access…</p>;
  if (!loggedIn || id == null) return <AccessDenied description="Sign in to access Observability workflows." />;
  if (error) return <main className="p-10" role="alert"><p>Could not verify access.</p><button className="mt-3 rounded-xl border px-4 py-2" onClick={() => setRetry((n) => n + 1)}>Retry</button></main>;
  if (!gate || gate.id !== id) return <p className="p-10 text-slate-500">Loading permissions…</p>;
  if (!gate.access.viewIncidents && !gate.access.viewOps) return <AccessDenied description="Ask an admin to assign an Observability role." />;
  return <Context.Provider value={gate.access}><div key={id}>{children}</div></Context.Provider>;
}
