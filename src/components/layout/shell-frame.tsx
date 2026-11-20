"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminUser, isSellerUser } from "@/features/auth/roles";
import { AccountNavigation } from "./account-navigation";
import { WorkspaceShell } from "./workspace-shell";
import { ADMIN_NAV, SELLER_NAV, workspaceFor } from "./workspace-nav";

/**
 * Chooses the page frame from the route. Navigation chrome is only shown to identities
 * whose role matches; route guards and the API still make every access decision.
 */
export function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const context = workspaceFor(pathname);
  if (context === "seller" && authenticated && isSellerUser(user)) {
    return <WorkspaceShell label="Seller workspace" subtitle="Seller studio" title={user?.full_name || "Your store"} groups={SELLER_NAV}>{children}</WorkspaceShell>;
  }
  if (context === "admin" && authenticated && isAdminUser(user)) {
    return <WorkspaceShell label="Admin workspace" subtitle={user?.is_superuser ? "Super admin" : "Platform admin"} title="MallByte operations" groups={ADMIN_NAV}>{children}</WorkspaceShell>;
  }
  if (context === "account" && authenticated) {
    return <div className="mx-auto w-full max-w-[88rem] lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-10 lg:px-8">
      <AccountNavigation />
      <div className="account-content min-w-0">{children}</div>
    </div>;
  }
  return <>{children}</>;
}
