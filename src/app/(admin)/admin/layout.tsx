"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SiteShell } from "@/components/layout/site-shell";
import { AdminOnlyRoute } from "@/features/auth/components/admin-only-route";
import { PlatformAnalyticsRoute } from "@/features/auth/components/platform-analytics-route";

/** Admin operations remain staff-only; analytics pages use Django RBAC roles. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const analyticsSection = ["/admin/financial", "/admin/finance", "/admin/analytics", "/admin/monitoring"]
    .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return (
    <SiteShell>
      {analyticsSection ? (
        <PlatformAnalyticsRoute>{children}</PlatformAnalyticsRoute>
      ) : (
        <AdminOnlyRoute>{children}</AdminOnlyRoute>
      )}
    </SiteShell>
  );
}
