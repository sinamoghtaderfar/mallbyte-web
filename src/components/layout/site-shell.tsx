import type { ReactNode } from "react";
import { CmsFooter } from "@/features/content/components/cms-footer";
import { SiteHeader } from "./site-header";
import { AccountNavigation } from "./account-navigation";
export function SiteShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen min-w-0 flex-col bg-background">
    <a href="#main-content" className="sr-only z-[100] rounded-lg bg-brand px-5 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3">Skip to content</a>
    <SiteHeader />
    <AccountNavigation />
    <div id="main-content" tabIndex={-1} className="min-w-0 flex-1">{children}</div>
    <CmsFooter />
  </div>;
}
