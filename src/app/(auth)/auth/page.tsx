"use client";

import { GuestOnlyRoute } from "@/features/auth/components/guest-only-route";
import { OtpLoginForm } from "@/features/auth/components/otp-login-form";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <GuestOnlyRoute>
        <OtpLoginForm />
      </GuestOnlyRoute>
    </main>
  );
}
