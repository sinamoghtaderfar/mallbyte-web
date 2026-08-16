import Link from "next/link";

import { SiteShell } from "@/components/layout/site-shell";
import { AuthStatusCard } from "@/features/auth/components/auth-status-card";

export default function HomePage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              MallByte Web
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
              Marketplace frontend for customers, sellers, and platform admins.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              This frontend is connected to the MallByte Django REST API and uses
              email OTP authentication with refresh tokens stored in HttpOnly
              cookies.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/profile"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                View profile
              </Link>

              <Link
                href="/products"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Browse products
              </Link>
            </div>
          </section>

          <AuthStatusCard />
        </div>
      </main>
    </SiteShell>
  );
}