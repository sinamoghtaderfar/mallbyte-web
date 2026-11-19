import Link from "next/link";
import { Layers2 } from "lucide-react";

export function Brand() {
  return <Link href="/" aria-label="MallByte home" className="inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-sm text-xl font-semibold tracking-tight text-slate-950">
    <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-white" aria-hidden="true"><Layers2 size={19} strokeWidth={1.8} /></span>
    MallByte<span className="text-brand" aria-hidden="true">.</span>
  </Link>;
}
