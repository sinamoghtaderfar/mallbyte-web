import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";

type Variant = "primary" | "accent" | "secondary" | "quiet" | "danger" | "inverse";
type Size = "default" | "small" | "large" | "icon";

const variants: Record<Variant, string> = {
  primary: "border-transparent bg-ink text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] hover:bg-ink-hover active:bg-black",
  accent: "border-transparent bg-brand text-white hover:bg-brand-hover",
  secondary: "border-line-strong/80 bg-surface text-foreground shadow-xs hover:border-slate-400 hover:bg-slate-50",
  quiet: "border-transparent text-slate-600 hover:bg-slate-100 hover:text-foreground",
  danger: "border-transparent bg-danger text-white hover:bg-rose-800",
  inverse: "border-transparent bg-white text-ink hover:bg-slate-100",
};
const sizes: Record<Size, string> = {
  default: "min-h-11 px-4.5 py-2.5",
  small: "min-h-11 px-3.5 py-2",
  large: "min-h-12 px-6 py-3 text-[0.9375rem]",
  icon: "size-11 shrink-0 p-2.5",
};

export function buttonStyles({ variant = "primary", size = "default", className = "" }: {
  variant?: Variant; size?: Size; className?: string;
} = {}) {
  return [
    "mb-button rounded-xl border text-sm font-medium leading-5 tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
    variants[variant], sizes[size], className,
  ].join(" ");
}

export function Button({ variant, size, loading = false, disabled, className, children, type = "button", ...props }:
  ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={buttonStyles({ variant, size, className })}>
    {loading && <LoaderCircle size={16} className="shrink-0 animate-spin" aria-hidden="true" />}{children}
  </button>;
}
