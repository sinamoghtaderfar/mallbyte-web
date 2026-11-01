"use client";

import type { ReactNode } from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "./access-denied";

export function SuperAdminOnlyRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore(s => s.user);
  const authenticated = useAuthStore(s => s.isAuthenticated);
  const bootstrapped = useAuthStore(s => s.isBootstrapped);
  const loading = useAuthStore(s => s.isLoading);
  if (!bootstrapped || loading) return <main role="status" className="mx-auto max-w-6xl px-6 py-10 text-sm text-slate-500">Checking permissions…</main>;
  if (!authenticated || !user?.is_superuser) return <AccessDenied title="Super Admin only" description="Your account is not a superuser." />;
  return <>{children}</>;
}
