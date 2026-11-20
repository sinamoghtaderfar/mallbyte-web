"use client";

import Link from "next/link";
import { ArrowLeft, LockKeyhole, PackageCheck, Store } from "lucide-react";

import { Brand, BrandMark } from "@/components/layout/brand";
import { GuestOnlyRoute } from "@/features/auth/components/guest-only-route";
import { OtpLoginForm } from "@/features/auth/components/otp-login-form";

export default function AuthPage() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative isolate hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute -left-24 top-1/3 -z-10 size-[28rem] rounded-full bg-brand/30 blur-[120px]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
        <Brand inverse />
        <div className="max-w-md">
          <BrandMark className="size-14 [&>rect:first-child]:fill-white/10" />
          <p className="mb-display mt-8 text-[3.5rem] leading-[1.02]">One account for <span className="italic text-ember-300">shopping</span> and <span className="italic text-ember-300">selling</span>.</p>
          <ul className="mt-10 space-y-4 text-sm text-slate-300">
            <li className="flex items-center gap-3"><LockKeyhole size={17} />Passwordless sign-in with a one-time email code</li>
            <li className="flex items-center gap-3"><PackageCheck size={17} />Orders, returns and support in one place</li>
            <li className="flex items-center gap-3"><Store size={17} />Apply to sell and manage your store</li>
          </ul>
        </div>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} MallByte</p>
      </aside>
      <main className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <span className="lg:hidden"><Brand /></span>
          <Link href="/" className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" />Back to store</Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <GuestOnlyRoute>
            <OtpLoginForm />
          </GuestOnlyRoute>
        </div>
      </main>
    </div>
  );
}
