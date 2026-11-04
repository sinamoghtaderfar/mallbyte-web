"use client";

import { FormEvent, useState } from "react";
import { Mail, ShieldCheck, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api/errors";
import { requestOtp, verifyOtp, setupAdminMfa, finishAdminMfa } from "../api";
import { useAuthStore } from "../auth-store";
import type { AuthSuccessResponse } from "../types";

type Step = "email" | "email-code" | "setup-password" | "setup-code" | "mfa-code" | "recovery" | "save-codes";

export function OtpLoginForm() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [challenge, setChallenge] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [authUri, setAuthUri] = useState("");
  const [factorCode, setFactorCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [savedUser, setSavedUser] = useState<AuthSuccessResponse["user"] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const [serverError, setServerError] = useState("");

  async function perform(fn: () => Promise<void>) {
    setIsSubmitting(true);
    setServerError("");
    setServerMessage("");
    try {
      await fn();
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function completeLogin(response: AuthSuccessResponse) {
    setUser(response.user);
    setChallenge("");
    setPassword("");
    setSecret("");
    setAuthUri("");
    setFactorCode("");
    if (response.recovery_codes?.length) {
      setRecoveryCodes(response.recovery_codes);
      setSavedUser(response.user);
      setStep("save-codes");
    } else {
      router.push(response.user.is_superuser ? "/admin/super" : "/");
    }
  }

  function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void perform(async () => {
      const response = await requestOtp({ email: email.trim() });
      setServerMessage(response.message);
      setStep("email-code");
    });
  }

  function handleEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(emailCode.trim())) {
      setServerError("Email verification code must be six digits.");
      return;
    }
    void perform(async () => {
      const response = await verifyOtp({ email: email.trim(), code: emailCode.trim() });
      setEmailCode("");
      if ("mfa_required" in response && response.mfa_required) {
        setChallenge(response.challenge);
        setStep(response.mfa_enrolled ? "mfa-code" : "setup-password");
        setServerMessage("Email verified. An additional factor is required for privileged accounts.");
      } else if ("access" in response) {
        completeLogin(response);
      }
    });
  }

  function handleSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void perform(async () => {
      const response = await setupAdminMfa({ challenge, password });
      setPassword("");
      setSecret(response.secret);
      setAuthUri(response.otpauth_uri);
      setFactorCode("");
      setStep("setup-code");
      setServerMessage("Add the secret to an authenticator app, then confirm the generated code.");
    });
  }

  function handleFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = factorCode.trim().toUpperCase().replace(/-/g, "");
    const enrollment = step === "setup-code";
    if (!(/^\d{6}$/.test(code) || (!enrollment && /^[0-9A-F]{12}$/.test(code)))) {
      setServerError("Enter a six-digit authenticator code or a valid recovery code.");
      return;
    }
    void perform(async () => {
      const response = await finishAdminMfa({ challenge, code }, enrollment);
      completeLogin(response);
    });
  }

  function restart() {
    setStep("email");
    setEmailCode("");
    setChallenge("");
    setPassword("");
    setSecret("");
    setAuthUri("");
    setFactorCode("");
    setServerError("");
    setServerMessage("");
  }

  const isEmailStep = step === "email";
  const isFactorStep = step === "setup-code" || step === "mfa-code" || step === "recovery";

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
          {isEmailStep ? <Mail size={24} /> : isFactorStep ? <KeyRound size={24} /> : <ShieldCheck size={24} />}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          {step === "email" ? "Sign in to MallByte"
            : step === "email-code" ? "Verify your email"
              : step === "setup-password" ? "Secure your admin account"
                : step === "setup-code" ? "Set up your authenticator"
                  : step === "mfa-code" ? "Authenticator verification"
                    : step === "recovery" ? "Use a recovery code"
                      : "Save your recovery codes"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {step === "email" ? "Receive a one-time code to your email."
            : step === "email-code" ? `Enter the six-digit code sent to ${email}.`
              : step === "setup-password" ? "Confirm your existing admin password before enabling MFA."
                : step === "setup-code" ? "Enter the account secret manually in Google Authenticator, Microsoft Authenticator or another TOTP app."
                  : step === "mfa-code" ? "Enter the six-digit code from your authenticator app."
                    : step === "recovery" ? "Enter one of your unused recovery codes."
                      : "Store these one-time recovery codes securely. They will not be shown again."}
        </p>
      </div>

      {serverMessage && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{serverMessage}</p>}
      {serverError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{serverError}</p>}

      {step === "email" && (
        <form onSubmit={handleEmail} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor="login-email">Email address</label>
          <input id="login-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-xl border px-4" />
          <button disabled={isSubmitting} type="submit" className="h-12 w-full rounded-xl bg-slate-900 text-white disabled:opacity-50">{isSubmitting ? "Sending..." : "Send code"}</button>
        </form>
      )}

      {step === "email-code" && (
        <form onSubmit={handleEmailCode} className="space-y-4">
          <label htmlFor="email-code" className="block text-sm font-medium">Email verification code</label>
          <input id="email-code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={emailCode} onChange={e => setEmailCode(e.target.value)} className="h-12 w-full rounded-xl border px-4 text-center tracking-widest" />
          <button disabled={isSubmitting} type="submit" className="h-12 w-full rounded-xl bg-slate-900 text-white disabled:opacity-50">{isSubmitting ? "Checking..." : "Verify email"}</button>
        </form>
      )}

      {step === "setup-password" && (
        <form onSubmit={handleSetup} className="space-y-4">
          <label htmlFor="admin-password" className="block text-sm font-medium">Existing admin password</label>
          <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="h-12 w-full rounded-xl border px-4" />
          <button disabled={isSubmitting} type="submit" className="h-12 w-full rounded-xl bg-slate-900 text-white disabled:opacity-50">{isSubmitting ? "Verifying..." : "Set up authenticator"}</button>
        </form>
      )}

      {step === "setup-code" && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-medium">Authenticator setup key</p>
          <code className="mt-2 block break-all select-all font-mono text-base">{secret}</code>
          <p className="mt-2 text-xs text-slate-600">Keep this key private. The setup URI is available for apps that support manual URI entry.</p>
          <details className="mt-2"><summary className="cursor-pointer">Show provisioning URI</summary><code className="mt-2 block break-all">{authUri}</code></details>
        </div>
      )}

      {isFactorStep && (
        <form onSubmit={handleFactor} className="space-y-4">
          <label htmlFor="factor-code" className="block text-sm font-medium">{step === "recovery" ? "Recovery code" : "Authenticator code"}</label>
          <input id="factor-code" autoComplete="one-time-code" inputMode={step === "recovery" ? "text" : "numeric"} required maxLength={step === "recovery" ? 14 : 6} value={factorCode} onChange={e => setFactorCode(e.target.value)} className="h-12 w-full rounded-xl border px-4 text-center font-mono tracking-widest" />
          <button disabled={isSubmitting} type="submit" className="h-12 w-full rounded-xl bg-slate-900 text-white disabled:opacity-50">{isSubmitting ? "Verifying..." : step === "setup-code" ? "Enable MFA and sign in" : "Verify and sign in"}</button>
          {step === "mfa-code" && <button type="button" onClick={() => { setFactorCode(""); setStep("recovery"); }} className="w-full text-sm text-slate-600 underline">Use a recovery code</button>}
          {step === "recovery" && <button type="button" onClick={() => { setFactorCode(""); setStep("mfa-code"); }} className="w-full text-sm text-slate-600 underline">Use authenticator instead</button>}
        </form>
      )}

      {step === "save-codes" && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-red-700">These codes are shown only once. Store them in a password manager.</p>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-4 font-mono text-sm">{recoveryCodes.map(code => <code key={code}>{code}</code>)}</div>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(recoveryCodes.join("\n")); }} className="h-11 w-full rounded-xl border text-sm">Copy recovery codes</button>
          <button type="button" onClick={() => { setRecoveryCodes([]); router.push(savedUser?.is_superuser ? "/admin/super" : "/"); }} className="h-12 w-full rounded-xl bg-slate-900 text-white">I saved my recovery codes</button>
        </div>
      )}

      {step !== "email" && step !== "save-codes" && (
        <button type="button" onClick={restart} className="mt-4 h-10 w-full rounded-xl border text-sm text-slate-600">Start over with another email</button>
      )}
    </div>
  );
}
