"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Search, Heart, UserRound, LogOut } from "lucide-react";
import { Brand } from "./brand";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
function linkClass(active: boolean) {
  return `inline-flex min-h-11 min-w-0 max-w-full items-center rounded-lg px-3 py-2 text-sm font-medium [overflow-wrap:anywhere] transition-colors ${active ? "bg-brand-soft text-brand" : "text-muted hover:bg-slate-100 hover:text-foreground"}`;
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
      setAccess(null); setMobileOpen(false);
      setLoggingOut(false); router.push("/auth");
    }
  }
  return <header className="sticky top-0 z-50 border-b border-line bg-white">
    <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3 px-4 py-3 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-8 lg:px-8">
      <Brand />
      <form action="/products" method="get" role="search" aria-label="Marketplace search" className="relative order-3 col-span-2 lg:order-2 lg:col-span-1">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-500" aria-hidden="true" />
        <Input type="search" name="search" aria-label="Search marketplace" placeholder="Find something you'll love" className="min-h-12 pl-11 pr-14" />
        <button type="submit" aria-label="Search" className="absolute right-0.5 top-0.5 flex size-11 items-center justify-center rounded-md text-brand transition-colors hover:bg-brand-soft"><Search size={18} aria-hidden="true" /></button>
      </form>
      <div className="order-2 flex items-center justify-end gap-1.5 lg:order-3">
        <Link href="/wishlist" aria-label="Wishlist" className={buttonStyles({ variant: "quiet", size: "icon", className: "hidden md:inline-flex" })}><Heart size={20} strokeWidth={1.8} aria-hidden="true" /></Link>
        <CartLink />
        {authenticated ? <NotificationBell /> : null}
        {authenticated && user ? <>
          <Link href="/profile" className={buttonStyles({ variant: "quiet", className: "hidden sm:inline-flex" })}><UserRound size={19} aria-hidden="true" /><span>Account</span></Link>
          <Button variant="quiet" size="icon" onClick={() => void handleLogout()} loading={loggingOut} className="hidden lg:inline-flex" aria-label={loggingOut ? "Signing out…" : "Sign out"}>{!loggingOut && <LogOut size={19} aria-hidden="true" />}</Button>
        </> : <Link href="/auth" className={buttonStyles({ variant: "secondary", size: "small" })}><UserRound size={18} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Sign in</span></Link>}
        <Button ref={menuTrigger} variant="quiet" size="icon" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-site-nav" onClick={() => setMobileOpen((v) => !v)} className="lg:hidden">{mobileOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}</Button>
      </div>
    </div>
    <div className="hidden border-t border-slate-100 lg:block">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-5 py-1 lg:px-6">
        {links.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={linkClass(isActive(item.href))}>{item.label}</Link>)}<CmsNavLinks />
      </nav>
    </div>
    {error && <p role="alert" className="mx-auto max-w-7xl px-4 pb-3 text-sm text-danger sm:px-6">{error}</p>}
    {mobileOpen && <nav id="mobile-site-nav" aria-label="Mobile navigation" className="max-h-[calc(100dvh-9rem)] overflow-y-auto border-t border-line bg-white px-4 py-3 lg:hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-1">
        {links.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setMobileOpen(false)} className={linkClass(isActive(item.href))}>{item.label}</Link>)}
        <Link href="/wishlist" onClick={() => setMobileOpen(false)} className={linkClass(isActive("/wishlist"))}>Wishlist</Link>
        <Link href="/addresses" onClick={() => setMobileOpen(false)} className={linkClass(isActive("/addresses"))}>Addresses</Link>
        <CmsNavLinks mobile onNavigate={() => setMobileOpen(false)} />
        {authenticated && <Button variant="quiet" loading={loggingOut} onClick={() => void handleLogout()} className="justify-start text-danger"><LogOut size={17} aria-hidden="true" />{loggingOut ? "Signing out…" : "Sign out"}</Button>}
      </div>
    </nav>}
  </header>;
}
