"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { getMyPermissions } from "@/features/rbac/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "@/features/auth/components/access-denied";
import type { CmsAccess } from "../types";

const CmsAccessContext = createContext<CmsAccess>({ canView: false, canEdit: false, canPublish: false });
export const useCmsAccess = () => useContext(CmsAccessContext);
type GateState = { userId: number; access: CmsAccess };

export function CmsRoute({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id);
  const loggedIn = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.isBootstrapped);
  const loading = useAuthStore((s) => s.isLoading);
  const [gate, setGate] = useState<GateState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    if (!bootstrapped || !loggedIn || userId == null) return;
    let active = true;
    void getMyPermissions()
      .then((r) => {
        if (!active) return;
        const permissions = r.user_id === userId ? r.permissions : [];
        const access: CmsAccess = {
          canView: permissions.includes("view_content_drafts"),
          canEdit: permissions.includes("manage_content"),
          canPublish: permissions.includes("publish_content"),
        };
        setNetworkError(false);
        setGate({ userId, access });
      })
      .catch(() => {
        if (active) {
          setNetworkError(true);
          setGate(null);
        }
      });
    return () => { active = false; };
  }, [bootstrapped, loggedIn, userId, attempt]);

  if (!bootstrapped || loading) {
    return <p role="status" className="mx-auto max-w-6xl p-10 text-slate-500">Checking your account…</p>;
  }
  if (!loggedIn || userId == null) {
    return <AccessDenied title="Sign in required" description="Sign in to open the content workspace." />;
  }
  if (networkError) {
    return <main role="alert" className="mx-auto max-w-2xl p-10"><h1 className="text-xl font-semibold">Could not check CMS access</h1><p className="mt-2 text-slate-600">The permission service is unavailable. Nothing was changed.</p><button className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-white" onClick={() => { setNetworkError(false); setAttempt((v) => v + 1); }}>Retry</button></main>;
  }
  if (gate?.userId !== userId) {
    return <p role="status" className="mx-auto max-w-6xl p-10 text-slate-500">Loading CMS permissions…</p>;
  }
  const access = gate.access;
  if (!access.canView && !access.canEdit && !access.canPublish) {
    return <AccessDenied description="Ask an administrator to assign a content role to your account." />;
  }
  return <CmsAccessContext.Provider value={access}>{children}</CmsAccessContext.Provider>;
}
