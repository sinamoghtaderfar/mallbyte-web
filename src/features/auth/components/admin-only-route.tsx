"use client";

import type { ReactNode } from "react";

import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminUser } from "@/features/auth/roles";

import { AccessDenied } from "./access-denied";

type AdminOnlyRouteProps = {
  children: ReactNode;
};

export function AdminOnlyRoute({ children }: AdminOnlyRouteProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (!isBootstrapped || isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-slate-500">Checking permissions...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <AccessDenied
        title="Sign in required"
        description="You need to sign in before opening the admin panel."
      />
    );
  }

  if (!isAdminUser(user)) {
    return (
      <AccessDenied description="Only staff and admin users can view this page." />
    );
  }

  return children;
}
