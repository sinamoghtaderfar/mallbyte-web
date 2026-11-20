"use client";

import { usePathname } from "next/navigation";
import { Activity, BarChart3, FileSearch, LayoutGrid } from "lucide-react";

import { SegmentedNav } from "@/components/ui/segmented-nav";

export const FINANCIAL_NAV = [
  { href: "/admin/financial", label: "Overview", icon: LayoutGrid },
  { href: "/admin/analytics", label: "Cash-flow analytics", icon: BarChart3 },
  { href: "/admin/finance", label: "Reconciliation", icon: FileSearch },
  { href: "/admin/monitoring", label: "Audit monitoring", icon: Activity },
] as const;

/** Sub-navigation shared by the four financial workspace pages. */
export function FinancialNav() {
  const pathname = usePathname();
  const active = FINANCIAL_NAV.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`))?.href ?? "";
  return (
    <SegmentedNav label="Financial workspace" value={active}
      items={FINANCIAL_NAV.map(({ href, label, icon }) => ({ id: href, href, label, icon }))} />
  );
}
