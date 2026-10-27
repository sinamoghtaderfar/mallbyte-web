"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { logout } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminUser, isSellerUser } from "@/features/auth/roles";
import { useCartStore } from "@/features/cart/cart-store";
import { CartLink } from "@/features/cart/components/cart-link";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { CmsNavLinks } from "@/features/content/components/cms-nav-links";
import { getMyPermissions } from "@/features/rbac/api";
import { getApiErrorMessage } from "@/lib/api/errors";

const commonLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/orders", label: "Orders" },
  { href: "/support", label: "Support" },
  { href: "/faq", label: "FAQ" },
  { href: "/profile", label: "Profile" },
];
function linkClass(active: boolean) {
  return `rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-cyan-700 ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`;
}
type Access = { userId: number; finance: boolean; cms: boolean };
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.isBootstrapped);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearCartState = useCartStore((s) => s.clearCartState);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");
  const [access, setAccess] = useState<Access | null>(null);

  useEffect(() => {
    if (!bootstrapped || !authenticated || userId === null) return;
    let active = true;
    const current = userId;
    void getMyPermissions()
      .then((r) => {
        if (!active) return;
        const permissions = r.user_id === current ? r.permissions : [];
        setAccess({
          userId: current,
          finance: permissions.includes("view_platform_analytics"),
          cms: ["view_content_drafts", "manage_content", "publish_content"].some((p) => permissions.includes(p)),
        });
      })
      .catch(() => { if (active) setAccess({ userId: current, finance: false, cms: false }); });
    return () => { active = false; };
  }, [authenticated, bootstrapped, userId]);

  const links = [
    ...commonLinks,
    ...(authenticated && isSellerUser(user) ? [{ href: "/seller/dashboard", label: "Seller" }] : []),
    ...(authenticated && isAdminUser(user) ? [{ href: "/admin", label: "Admin" }] : []),
    ...(authenticated && userId != null && access?.userId === userId && access.finance ? [{ href: "/admin/financial", label: "Finance" }] : []),
    ...(authenticated && userId != null && access?.userId === userId && access.cms ? [{ href: "/admin/content", label: "CMS" }] : []),
  ];
  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/financial") return ["/admin/financial", "/admin/analytics", "/admin/finance", "/admin/monitoring"]
      .some((p) => pathname === p || pathname.startsWith(`${p}/`));
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  async function handleLogout() {
    setError(""); setLoggingOut(true);
    try { await logout(); }
    catch (reason) { setError(getApiErrorMessage(reason)); }
    finally {
      setAccess(null); clearAuth(); clearCartState(); setMobileOpen(false);
      setLoggingOut(false); router.push("/auth");
    }
  }
  return <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4">
      <div className="flex min-w-0 items-center gap-5 lg:gap-7"><Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-slate-950">MallByte</Link>
        <nav className="hidden items-center gap-1 2xl:flex" aria-label="Main navigation">{links.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={linkClass(isActive(item.href))}>{item.label}</Link>)}<CmsNavLinks/></nav>
      </div>
      <div className="flex items-center gap-2 sm:gap-3"><CartLink/>{authenticated ? <NotificationBell/> : null}
        {authenticated && user ? <><div className="hidden max-w-44 truncate text-right xl:block"><p className="truncate text-sm font-medium text-slate-900">{user.full_name || "MallByte User"}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div><button type="button" onClick={() => void handleLogout()} disabled={loggingOut} className="hidden h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:block">{loggingOut ? "Signing out…" : "Sign out"}</button></> : <Link href="/auth" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Sign in</Link>}
        <button type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-site-nav" onClick={() => setMobileOpen((v) => !v)} className="rounded-xl border border-slate-200 p-2 text-slate-700 focus-visible:outline-2 focus-visible:outline-cyan-700 2xl:hidden">{mobileOpen ? <X size={20}/> : <Menu size={20}/>}</button>
      </div>
    </div>
    {error && <p role="alert" className="mx-auto max-w-7xl px-4 pb-2 text-xs text-red-700">{error}</p>}
    {mobileOpen && <nav id="mobile-site-nav" aria-label="Mobile navigation" className="border-t border-slate-200 bg-white px-4 py-3 2xl:hidden"><div className="mx-auto flex max-w-7xl flex-col gap-1">{links.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setMobileOpen(false)} className={linkClass(isActive(item.href))}>{item.label}</Link>)}<CmsNavLinks mobile onNavigate={() => setMobileOpen(false)}/>{authenticated && <button type="button" disabled={loggingOut} onClick={() => void handleLogout()} className="rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-700 sm:hidden">Sign out</button>}</div></nav>}
  </header>;
}
