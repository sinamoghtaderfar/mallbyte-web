"use client";

import { SiteShell } from "@/components/layout/site-shell";
import { SuperAdminOnlyRoute } from "@/features/auth/components/super-admin-only-route";
import { AdminOnlyRoute } from "@/features/auth/components/admin-only-route";
import { PlatformAnalyticsRoute } from "@/features/auth/components/platform-analytics-route";
import { CmsRoute } from "@/features/content/components/cms-route";
import { ObservabilityRoute } from "@/features/observability/components/access";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const superArea = pathname === "/admin/super" || pathname.startsWith("/admin/super/");
  const obs = pathname === "/admin/observability" || pathname.startsWith("/admin/observability/");
  const cms = pathname === "/admin/content" || pathname.startsWith("/admin/content/");
  const financial = ["/admin/financial", "/admin/finance", "/admin/analytics", "/admin/monitoring"]
    .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return <SiteShell>{superArea ? <SuperAdminOnlyRoute>{children}</SuperAdminOnlyRoute> : obs ? <ObservabilityRoute>{children}</ObservabilityRoute> : cms ? <CmsRoute>{children}</CmsRoute> : financial ? <PlatformAnalyticsRoute>{children}</PlatformAnalyticsRoute> : <AdminOnlyRoute>{children}</AdminOnlyRoute>}</SiteShell>;
}
