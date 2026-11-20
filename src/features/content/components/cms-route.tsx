"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { getMyPermissions } from "@/features/rbac/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "@/features/auth/components/access-denied";
import { Button } from "@/components/ui/button";
import { Notice, Skeleton } from "@/components/ui/states";
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
    return <GateLoading label="Checking your account…" />;
  }
  if (!loggedIn || userId == null) {
    return <AccessDenied title="Sign in required" description="Sign in to open the content workspace." />;
  }
  if (networkError) {
    return <main className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Could not check CMS access</h1>
      <Notice tone="danger" className="mt-4" action={<Button size="small" variant="secondary" onClick={() => { setNetworkError(false); setAttempt((v) => v + 1); }}>Retry</Button>}>
        The permission service is unavailable. Nothing was changed.
      </Notice>
    </main>;
  }
  if (gate?.userId !== userId) {
    return <GateLoading label="Loading CMS permissions…" />;
  }
  const access = gate.access;
  if (!access.canView && !access.canEdit && !access.canPublish) {
    return <AccessDenied description="Ask an administrator to assign a content role to your account." />;
  }
  return <CmsAccessContext.Provider value={access}>{children}</CmsAccessContext.Provider>;
}

function GateLoading({ label }: { label: string }) {
  return <div className="grid gap-6" aria-busy="true">
    <p role="status" className="text-sm text-muted">{label}</p>
    <Skeleton className="h-20 max-w-xl" />
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"><Skeleton className="h-64" /><Skeleton className="h-96" /></div>
  </div>;
}
