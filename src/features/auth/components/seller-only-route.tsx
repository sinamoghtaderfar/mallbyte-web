"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { useAuthStore } from "@/features/auth/auth-store";
import { isSellerUser } from "@/features/auth/roles";

import { AccessDenied } from "./access-denied";

type SellerOnlyRouteProps = {
  children: ReactNode;
};

export function SellerOnlyRoute({ children }: SellerOnlyRouteProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (!isBootstrapped || isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-slate-500">Checking seller access...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <AccessDenied
        title="Sign in required"
        description="You need to sign in before opening the seller panel."
      />
    );
  }

  if (!isSellerUser(user)) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Seller account required
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">
            This page is for sellers
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Apply to become a seller before using seller tools.
          </p>
          <Link
            href="/seller/status"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Go to seller status
          </Link>
        </div>
      </main>
    );
  }

  return children;
}
