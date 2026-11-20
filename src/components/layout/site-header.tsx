"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Search, Heart, UserRound, LogOut, Store, ShieldCheck, LineChart, PenSquare } from "lucide-react";
import { Brand } from "./brand";
import { Button, buttonStyles } from "@/components/ui/button";
import { logout } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminUser, isSellerUser } from "@/features/auth/roles";
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
const workspaceIcons: Record<string, typeof Store> = {
  "/seller/dashboard": Store, "/admin": ShieldCheck, "/admin/financial": LineChart, "/admin/content": PenSquare,
};
function linkClass(active: boolean) {
  return `relative inline-flex min-h-11 min-w-0 max-w-full items-center rounded-lg px-3 py-2 text-sm font-medium [overflow-wrap:anywhere] transition-colors ${active ? "text-ink after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-ink" : "text-slate-600 hover:text-ink"}`;
}
function mobileLinkClass(active: boolean) {
  return `flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium [overflow-wrap:anywhere] transition-colors ${active ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-100"}`;
}
function workspaceClass(active: boolean) {
  return `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-medium transition-colors ${active ? "border-ink bg-ink text-white" : "border-line-strong/80 bg-surface text-slate-700 hover:border-slate-400 hover:text-ink"}`;
}
type Access = { userId: number; finance: boolean; cms: boolean };
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.isBootstrapped);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      menuTrigger.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const workspaceLinks = [
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
    if (href === "/seller/dashboard") return pathname.startsWith("/seller/") && !pathname.startsWith("/seller/apply") && !pathname.startsWith("/seller/status");
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  async function handleLogout() {
    setError(""); setLoggingOut(true);
    try { await logout(); }
    catch (reason) { setError(getApiErrorMessage(reason)); }
    finally {
      setAccess(null); setMobileOpen(false);
      setLoggingOut(false); router.push("/auth");
    }
  }
  const firstName = user?.full_name?.trim().split(/\s+/)[0];
  return <header className="sticky top-0 z-50 border-b border-line bg-background/90 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/80">
    <div className="mx-auto grid w-full max-w-[88rem] grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5 px-4 pb-3 pt-3 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-10 lg:px-8 lg:pb-2">
      <Brand />
      <form action="/products" method="get" role="search" aria-label="Marketplace search" className="group relative order-3 col-span-2 lg:order-2 lg:col-span-1 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-ink" aria-hidden="true" />
        <input type="search" name="search" aria-label="Search marketplace" placeholder="Search products, brands and makers"
          className="h-12 w-full min-w-0 rounded-full border border-line-strong/70 bg-surface pl-11 pr-14 text-base text-foreground shadow-xs placeholder:text-slate-500 transition-[border-color,box-shadow] hover:border-slate-400 focus:border-ink focus:shadow-[0_0_0_4px_rgb(18_18_17/0.06)] focus:outline-none sm:text-sm" />
        <button type="submit" aria-label="Search" className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-ink-hover"><Search size={17} aria-hidden="true" /></button>
      </form>
      <div className="order-2 flex items-center justify-end gap-0.5 lg:order-3">
        <Link href="/wishlist" aria-label="Wishlist" className={buttonStyles({ variant: "quiet", size: "icon", className: "hidden rounded-full md:inline-flex" })}><Heart size={20} strokeWidth={1.7} aria-hidden="true" /></Link>
        {authenticated ? <NotificationBell /> : null}
        <CartLink />
        {authenticated && user ? <>
          <Link href="/profile" className={buttonStyles({ variant: "quiet", className: "hidden rounded-full pl-1.5 sm:inline-flex" })}>
            <span className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold uppercase text-slate-800" aria-hidden="true">{(firstName ?? user.email).slice(0, 1)}</span>
            <span className="max-w-28 truncate">Account</span>
          </Link>
          <Button variant="quiet" size="icon" onClick={() => void handleLogout()} loading={loggingOut} className="hidden rounded-full lg:inline-flex" aria-label={loggingOut ? "Signing out…" : "Sign out"}>{!loggingOut && <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />}</Button>
        </> : <Link href="/auth" className={buttonStyles({ variant: "primary", size: "small", className: "ml-1 rounded-full px-4" })}><UserRound size={17} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Sign in</span></Link>}
        <Button ref={menuTrigger} variant="quiet" size="icon" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-site-nav" onClick={() => setMobileOpen((v) => !v)} className="rounded-full lg:hidden">{mobileOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}</Button>
      </div>
    </div>
    <div className="hidden lg:block">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-[88rem] flex-wrap items-center gap-x-1 gap-y-1 px-5 pb-1 lg:px-6">
        {commonLinks.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={linkClass(isActive(item.href))}>{item.label}</Link>)}
        <CmsNavLinks />
        {workspaceLinks.length > 0 && <span className="ml-auto flex flex-wrap items-center gap-1.5 py-1">
          {workspaceLinks.map((item) => { const Icon = workspaceIcons[item.href]; return <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={workspaceClass(isActive(item.href))}>{Icon && <Icon size={14} aria-hidden="true" />}{item.label}</Link>; })}
        </span>}
      </nav>
    </div>
    {error && <p role="alert" className="mx-auto max-w-[88rem] px-4 pb-3 text-sm text-danger sm:px-6">{error}</p>}
    {mobileOpen && <nav id="mobile-site-nav" aria-label="Mobile navigation" className="max-h-[calc(100dvh-8.5rem)] overflow-y-auto border-t border-line bg-surface px-4 pb-6 pt-4 shadow-lg lg:hidden">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-1">
        <p className="mb-eyebrow px-3 pb-1">Shop</p>
        {commonLinks.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive(item.href))}>{item.label}</Link>)}
        <Link href="/wishlist" onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive("/wishlist"))}>Wishlist</Link>
        <Link href="/addresses" onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive("/addresses"))}>Addresses</Link>
        <CmsNavLinks mobile onNavigate={() => setMobileOpen(false)} />
        {workspaceLinks.length > 0 && <>
          <p className="mb-eyebrow mt-4 px-3 pb-1">Workspaces</p>
          {workspaceLinks.map((item) => { const Icon = workspaceIcons[item.href]; return <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setMobileOpen(false)} className={mobileLinkClass(isActive(item.href))}>{Icon && <Icon size={17} aria-hidden="true" />}{item.label}</Link>; })}
        </>}
        {authenticated && <Button variant="quiet" loading={loggingOut} onClick={() => void handleLogout()} className="mt-3 min-h-12 justify-start rounded-xl border-line text-danger hover:bg-rose-50 hover:text-danger"><LogOut size={17} aria-hidden="true" />{loggingOut ? "Signing out…" : "Sign out"}</Button>}
      </div>
    </nav>}
  </header>;
}
