"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getApiErrorMessage } from "@/lib/api/errors";

import { requestOtp, verifyOtp } from "../api";
import { useAuthStore } from "../auth-store";

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Code must be 6 digits."),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;

type Step = "email" | "code";

export function OtpLoginForm() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [serverMessage, setServerMessage] = useState("");
  const [serverError, setServerError] = useState("");

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const codeForm = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: "",
    },
  });

  async function handleEmailSubmit(values: EmailFormValues) {
    setServerError("");
    setServerMessage("");

    try {
      const response = await requestOtp({
        email: values.email,
      });

      setEmail(values.email);
      setStep("code");
      setServerMessage(response.message);
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    }
  }

  async function handleCodeSubmit(values: CodeFormValues) {
    setServerError("");
    setServerMessage("");

    try {
      const response = await verifyOtp({
        email,
        code: values.code,
      });

      setUser(response.user);
      router.push("/");
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    }
  }

  function handleChangeEmail() {
    setStep("email");
    setServerError("");
    setServerMessage("");
    codeForm.reset();
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
          {step === "email" ? <Mail size={24} /> : <ShieldCheck size={24} />}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          {step === "email" ? "Sign in to MallByte" : "Enter verification code"}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {step === "email"
            ? "Use your email to receive a one-time login code."
            : `We sent a 6-digit code to ${email}.`}
        </p>
      </div>

      {serverMessage ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {serverMessage}
        </div>
      ) : null}

      {serverError ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      ) : null}

      {step === "email" ? (
        <form
          className="space-y-4"
          onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
        >
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="email"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900"
              {...emailForm.register("email")}
            />

            {emailForm.formState.errors.email ? (
              <p className="mt-2 text-sm text-red-600">
                {emailForm.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={emailForm.formState.isSubmitting}
            className="h-12 w-full rounded-2xl bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {emailForm.formState.isSubmitting ? "Sending code..." : "Send code"}
          </button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={codeForm.handleSubmit(handleCodeSubmit)}
        >
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="code"
            >
              Verification code
            </label>

            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-center text-lg tracking-[0.4em] outline-none transition focus:border-slate-900"
              maxLength={6}
              {...codeForm.register("code")}
            />

            {codeForm.formState.errors.code ? (
              <p className="mt-2 text-sm text-red-600">
                {codeForm.formState.errors.code.message}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={codeForm.formState.isSubmitting}
            className="h-12 w-full rounded-2xl bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {codeForm.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={handleChangeEmail}
            className="h-11 w-full rounded-2xl border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Use another email
          </button>
        </form>
      )}
    </div>
  );
}
