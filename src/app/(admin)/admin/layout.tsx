import type { ReactNode } from "react";

import { SiteShell } from "@/components/layout/site-shell";
import { AdminOnlyRoute } from "@/features/auth/components/admin-only-route";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SiteShell>
      <AdminOnlyRoute>{children}</AdminOnlyRoute>
    </SiteShell>
  );
}
