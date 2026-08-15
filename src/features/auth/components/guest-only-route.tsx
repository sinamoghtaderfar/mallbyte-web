"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "../auth-store";

type GuestOnlyRouteProps = {
  children: React.ReactNode;
};

export function GuestOnlyRoute({ children }: GuestOnlyRouteProps) {
  const router = useRouter();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);

  const shouldWait = isLoading || !isBootstrapped;
  const shouldRedirect = isBootstrapped && isAuthenticated;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace("/profile");
    }
  }, [router, shouldRedirect]);

  if (shouldWait) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm text-slate-500">
          Checking your session...
        </p>
      </div>
    );
  }

  if (shouldRedirect) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm text-slate-500">
          Redirecting to your profile...
        </p>
      </div>
    );
  }

  return children;
}
