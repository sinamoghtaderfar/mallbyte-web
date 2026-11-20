import type { ReactNode } from "react";
import { CmsFooter } from "@/features/content/components/cms-footer";
import { SiteHeader } from "./site-header";
import { ShellFrame } from "./shell-frame";
export function SiteShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen min-w-0 flex-col bg-background">
    <a href="#main-content" className="sr-only z-[100] rounded-xl bg-ink px-5 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3">Skip to content</a>
    <SiteHeader />
    <div id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none"><ShellFrame>{children}</ShellFrame></div>
    <CmsFooter />
  </div>;
}
