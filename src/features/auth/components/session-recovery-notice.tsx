"use client";

import Link from "next/link";
import { logout } from "../api";
import { useAuthStore } from "../auth-store";

export function SessionRecoveryNotice() {
  const issue = useAuthStore((state) => state.sessionIssue);
  const busy = useAuthStore((state) => state.isSigningOut);
  if (!issue) return null;
  return (
    <div
      role="alert"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      {issue === "expired" ? (
        <>
          Your session has expired.{" "}
          <Link href="/auth" className="font-semibold underline">
            Sign in again
          </Link>{" "}
          to continue.
        </>
      ) : (
        <>
          You are signed out on this browser.{" "}
          {busy
            ? "Confirming server sign-out…"
            : "Server sign-out could not be confirmed."}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void logout().catch(() => undefined);
            }}
            className="ml-3 font-semibold underline disabled:opacity-60"
          >
            {busy ? "Signing out…" : "Retry server sign-out"}
          </button>
        </>
      )}
    </div>
  );
}
