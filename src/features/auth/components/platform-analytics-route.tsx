"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { getMyPermissions } from "@/features/rbac/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "./access-denied";

type PermissionState = { userId: number; allowed: boolean };

/**
 * UX-only permission gate. The API remains authoritative.
 * A decision for a previous session/user is NEVER reused while the next
 * account's permissions are in flight.
 */
export function PlatformAnalyticsRoute({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id);
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.isBootstrapped);
  const authLoading = useAuthStore((s) => s.isLoading);
  const [state, setState] = useState<PermissionState | null>(null);

  useEffect(() => {
    if (!bootstrapped || !authenticated || userId == null) return;
    let active = true;
    void getMyPermissions()
      .then((result) => {
        if (active) {
          setState({
            userId,
            allowed: result.user_id === userId &&
              result.permissions.includes("view_platform_analytics"),
          });
        }
      })
      .catch(() => {
        if (active) setState({ userId, allowed: false });
      });
    return () => { active = false; };
  }, [authenticated, bootstrapped, userId]);

  if (!bootstrapped || authLoading) {
    return <main role="status" className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-600">Checking your session…</main>;
  }
  if (!authenticated || userId == null) {
    return <AccessDenied title="Sign in required" description="Sign in to view platform analytics." />;
  }
  if (state?.userId !== userId) {
    return <main role="status" className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-600">Checking analytics permissions…</main>;
  }
  if (!state.allowed) {
    return <AccessDenied description="Your account does not have platform analytics permission." />;
  }
  return <>{children}</>;
}
