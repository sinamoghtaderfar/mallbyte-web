"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "../auth-store";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);

  const shouldWait = isLoading || !isBootstrapped;
  const shouldRedirect = isBootstrapped && !isAuthenticated;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace("/auth");
    }
  }, [router, shouldRedirect]);

  if (shouldWait) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Checking your session...</p>
      </div>
    );
  }

  if (shouldRedirect) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Redirecting to sign in...</p>
      </div>
    );
  }

  return children;
}
