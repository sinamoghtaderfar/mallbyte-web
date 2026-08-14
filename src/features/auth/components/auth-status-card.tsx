"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { logout } from "../api";
import { useAuthStore } from "../auth-store";

export function AuthStatusCard() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    setIsLoggingOut(true);

    try {
      await logout();
    } catch (logoutError) {
      setError(getApiErrorMessage(logoutError));
    } finally {
      clearAuth();
      setIsLoggingOut(false);
      router.push("/auth");
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Checking your session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          You are not signed in
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Sign in with your email to continue using MallByte.
        </p>

        <Link
          href="/auth"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-emerald-600">Signed in</p>

        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          {user.full_name || "MallByte User"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">{user.email}</p>

        {user.is_seller ? (
          <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Seller account
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="mt-6 h-11 rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
