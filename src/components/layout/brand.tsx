import Link from "next/link";

/** MallByte mark: two arcade arches form an "m"; the ember square is the byte. */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
    <rect width="32" height="32" rx="9" fill="#121211" />
    <path d="M8 23V14.5a3.5 3.5 0 0 1 7 0V23M15 23v-8.5a3.5 3.5 0 0 1 7 0V23" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="22.2" y="19.6" width="3.6" height="3.6" rx="0.9" fill="#ec5a20" />
  </svg>;
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" aria-label="MallByte home" className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-md text-[1.3125rem] font-semibold tracking-[-0.035em] ${inverse ? "text-white" : "text-ink"}`}>
    <BrandMark className={`size-8 ${inverse ? "[&>rect:first-child]:fill-white [&>path]:stroke-ink" : ""}`} />
    <span>mallbyte</span>
  </Link>;
}
