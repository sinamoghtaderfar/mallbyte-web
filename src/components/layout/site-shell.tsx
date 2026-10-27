import type { ReactNode } from "react";
import { CmsFooter } from "@/features/content/components/cms-footer";
import { SiteHeader } from "./site-header";
export function SiteShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-slate-50"><SiteHeader/><div className="flex-1">{children}</div><CmsFooter/></div>;
}
