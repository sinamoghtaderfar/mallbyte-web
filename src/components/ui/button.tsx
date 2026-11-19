import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";

type Variant = "primary" | "secondary" | "quiet" | "danger";
type Size = "default" | "small" | "icon";

export function buttonStyles({ variant = "primary", size = "default", className = "" }: {
  variant?: Variant; size?: Size; className?: string;
} = {}) {
  const variants = {
    primary: "border-transparent bg-brand text-white hover:bg-brand-hover",
    secondary: "border-line bg-surface text-foreground hover:border-slate-400 hover:bg-slate-50",
    quiet: "border-transparent text-muted hover:bg-slate-100 hover:text-foreground",
    danger: "border-transparent bg-danger text-white hover:bg-rose-800",
  };
  const sizes = { default: "min-h-11 px-4 py-2.5", small: "min-h-11 px-3 py-2", icon: "size-11 shrink-0 p-2.5" };
  return ["mb-button rounded-lg border text-sm font-semibold leading-5 transition-colors disabled:cursor-not-allowed disabled:opacity-50", variants[variant], sizes[size], className].join(" ");
}

export function Button({ variant, size, loading = false, disabled, className, children, type = "button", ...props }:
  ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={buttonStyles({ variant, size, className })}>
    {loading && <LoaderCircle size={16} className="shrink-0 animate-spin" aria-hidden="true" />}{children}
  </button>;
}
