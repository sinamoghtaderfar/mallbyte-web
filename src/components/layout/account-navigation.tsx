"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";

const links = [
  ["/profile", "Overview"], ["/orders", "Orders"], ["/wishlist", "Wishlist"],
  ["/addresses", "Addresses"], ["/returns", "Returns"], ["/notifications", "Notifications"],
  ["/support", "Support"], ["/recently-viewed", "Recently viewed"],
] as const;

export function AccountNavigation() {
  const pathname = usePathname();
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  if (!authenticated || !links.some(([href]) => pathname === href || pathname.startsWith(`${href}/`))) return null;
  return <div className="border-b border-line bg-white">
    <nav aria-label="Account navigation" className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
      {links.map(([href, label]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}
          className={`inline-flex min-h-12 shrink-0 items-center border-b-2 px-3 text-sm font-medium ${active ? "border-brand text-brand" : "border-transparent text-muted hover:border-slate-300 hover:text-foreground"}`}>{label}</Link>;
      })}
    </nav>
  </div>;
}
