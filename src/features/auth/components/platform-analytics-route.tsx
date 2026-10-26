"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { getMyPermissions } from "@/features/rbac/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "./access-denied";

/** Convenience UX gate. Every Django endpoint still enforces RBAC. */
export function PlatformAnalyticsRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.isBootstrapped);
  const authLoading = useAuthStore((s) => s.isLoading);
  const [permission, setPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (!bootstrapped || !authenticated) return;
    let active = true;
    void getMyPermissions()
      .then((response) => {
        if (active) setPermission(response.permissions.includes("view_platform_analytics"));
      })
      .catch(() => {
        if (active) setPermission(false);
      });
    return () => { active = false; };
  }, [authenticated, bootstrapped, user?.id]);

  if (!bootstrapped || authLoading || (authenticated && permission === null)) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-600" role="status">Checking analytics permissions…</main>;
  }
  if (!authenticated) {
    return <AccessDenied title="Sign in required" description="Sign in to view platform analytics." />;
  }
  if (!permission) {
    return <AccessDenied description="Your account does not have platform analytics permission." />;
  }
  return <>{children}</>;
}
