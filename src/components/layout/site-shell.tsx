import type { ReactNode } from "react";

import { SiteHeader } from "./site-header";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      {children}
    </div>
  );
}
