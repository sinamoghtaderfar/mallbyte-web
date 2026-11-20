import type { ComponentProps, ReactNode } from "react";

export const controlStyles = "min-h-11 w-full min-w-0 rounded-xl border border-line-strong/80 bg-surface px-3.5 py-2.5 text-base text-foreground shadow-xs placeholder:text-slate-500 transition-[border-color,box-shadow] duration-150 hover:border-slate-400 focus:border-ink focus:shadow-[0_0_0_4px_rgb(18_18_17/0.06)] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 sm:text-sm aria-invalid:border-danger aria-invalid:shadow-[0_0_0_4px_rgb(180_35_53/0.08)]";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${controlStyles} ${className}`} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${controlStyles} mb-select pr-10 ${className}`} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${controlStyles} min-h-28 resize-y ${className}`} />;
}

/** Label + control + help/error wiring. Callers pass ids so aria-describedby stays explicit. */
export function Field({ label, htmlFor, hint, error, hintId, errorId, required, children, className = "" }: {
  label: ReactNode; htmlFor: string; hint?: ReactNode; error?: ReactNode; hintId?: string; errorId?: string;
  required?: boolean; children: ReactNode; className?: string;
}) {
  return <div className={`grid gap-1.5 ${className}`}>
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{label}{required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}</label>
    {children}
    {hint && !error && <p id={hintId} className="text-xs leading-5 text-muted">{hint}</p>}
    {error && <p id={errorId} role="alert" className="text-xs font-medium leading-5 text-danger">{error}</p>}
  </div>;
}
