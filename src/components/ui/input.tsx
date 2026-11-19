import type { ComponentProps } from "react";

export const controlStyles = "min-h-11 w-full min-w-0 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base text-foreground placeholder:text-slate-500 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 sm:text-sm aria-invalid:border-danger";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${controlStyles} ${className}`} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${controlStyles} ${className}`} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${controlStyles} min-h-28 resize-y ${className}`} />;
}
