"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Clock3, Heart, LifeBuoy, MapPin, Package, RotateCcw, UserRound } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";

const links = [
  ["/profile", "Overview", UserRound], ["/orders", "Orders", Package], ["/wishlist", "Wishlist", Heart],
  ["/addresses", "Addresses", MapPin], ["/returns", "Returns", RotateCcw], ["/notifications", "Notifications", Bell],
  ["/support", "Support", LifeBuoy], ["/recently-viewed", "Recently viewed", Clock3],
] as const;

export function AccountNavigation() {
  const pathname = usePathname();
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (!authenticated || !links.some(([href]) => pathname === href || pathname.startsWith(`${href}/`))) return null;
  return <aside className="border-b border-line bg-surface lg:sticky lg:top-[7.25rem] lg:my-10 lg:self-start lg:border-0 lg:bg-transparent">
    {user && <div className="hidden px-3 pb-5 lg:block">
      <p className="mb-eyebrow">Your account</p>
      <p className="mt-1 truncate text-base font-semibold tracking-tight text-ink">{user.full_name || user.email}</p>
    </div>}
    <nav aria-label="Account navigation" className="mb-scrollbar-none mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 py-2.5 sm:px-6 lg:flex-col lg:overflow-visible lg:p-0">
      {links.map(([href, label, Icon]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}
          className={`group inline-flex min-h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-3.5 text-sm transition-colors lg:min-h-10 lg:rounded-lg lg:px-3 ${active ? "bg-ink font-medium text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink"}`}>
          <Icon size={16} strokeWidth={1.8} className={active ? "" : "text-slate-500 group-hover:text-ink"} aria-hidden="true" />{label}</Link>;
      })}
    </nav>
  </aside>;
}
