"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { AdminOnlyRoute } from "@/features/auth/components/admin-only-route";
import { PlatformAnalyticsRoute } from "@/features/auth/components/platform-analytics-route";
import { CmsRoute } from "@/features/content/components/cms-route";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const cms = pathname === "/admin/content" || pathname.startsWith("/admin/content/");
  const financial = ["/admin/financial", "/admin/finance", "/admin/analytics", "/admin/monitoring"]
    .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return <SiteShell>{cms ? <CmsRoute>{children}</CmsRoute> : financial ? <PlatformAnalyticsRoute>{children}</PlatformAnalyticsRoute> : <AdminOnlyRoute>{children}</AdminOnlyRoute>}</SiteShell>;
}
