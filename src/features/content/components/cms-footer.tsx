"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { workspaceFor } from "@/components/layout/workspace-nav";
import { Brand } from "@/components/layout/brand";
import { useEffect, useState } from "react";
import { fetchPublicNavigation } from "../api";
import { safeContentUrl } from "../safety";
import { publicNavigationItems } from "../navigation";
import type { NavigationItem } from "../types";

const columns = [
  { title: "Shop", links: [["All products", "/products"], ["New arrivals", "/products?ordering=-created_at"], ["On sale", "/products?has_discount=true"], ["Wishlist", "/wishlist"]] },
  { title: "Help", links: [["Help centre", "/faq"], ["Contact support", "/support"], ["Orders", "/orders"], ["Returns", "/returns"]] },
  { title: "Sell", links: [["Become a seller", "/seller/apply"], ["Application status", "/seller/status"], ["Seller dashboard", "/seller/dashboard"]] },
] as const;

export function CmsFooter() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  useEffect(() => {
    let active = true;
    void fetchPublicNavigation("footer")
      .then((menus) => { if (active) setItems(publicNavigationItems(menus)); })
      .catch(() => { /* Keep the static fallback footer on public API failures. */ });
    return () => { active = false; };
  }, []);
  const fallback = [{ id: -1, label: "Products", url: "/products", open_in_new_tab: false }, { id: -2, label: "FAQ", url: "/faq", open_in_new_tab: false }, { id: -3, label: "Support", url: "/support", open_in_new_tab: false }];
  const links = items.length ? items : fallback;
  const pathname = usePathname() ?? "";
  const ctx = workspaceFor(pathname);
  if (ctx === "seller" || ctx === "admin") {
    // Workspaces get a quiet utility footer; the same footer links remain available.
    return <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-xs text-muted">© {new Date().getFullYear()} MallByte · {ctx === "seller" ? "Seller studio" : "Operations workspace"}</p>
        <nav aria-label="Footer links" className="flex flex-wrap gap-x-5">{links.map((item) => {
          const href = safeContentUrl(item.url);
          return href && <Link key={item.id} href={href} target={item.open_in_new_tab ? "_blank" : undefined} rel={item.open_in_new_tab ? "noopener noreferrer" : undefined} className="inline-flex min-h-10 items-center text-xs text-muted hover:text-ink">{item.label}</Link>;
        })}</nav>
      </div>
    </footer>;
  }
  return <footer className="mt-auto bg-ink text-slate-300">
    <div className="mx-auto max-w-[88rem] px-4 pb-10 pt-16 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm">
          <Brand inverse />
          <p className="mb-display mt-6 text-[2rem] leading-[1.08] text-white">Independent makers.<br /><span className="italic text-ember-300">One considered marketplace.</span></p>
          <p className="mt-4 text-sm leading-6 text-slate-400">Secure checkout, transparent order tracking and a clear returns process for every purchase.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((column) => <div key={column.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{column.title}</h2>
            <ul className="mt-4 space-y-1">
              {column.links.map(([label, href]) => <li key={href}><Link href={href} className="inline-flex min-h-9 items-center text-sm text-slate-400 transition-colors hover:text-white">{label}</Link></li>)}
            </ul>
          </div>)}
        </div>
      </div>
      <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} MallByte. All rights reserved.</p>
        <nav aria-label="Footer links" className="flex max-w-2xl flex-wrap gap-x-5 gap-y-1">{links.map((item) => {
          const href = safeContentUrl(item.url);
          return href && <Link key={item.id} href={href} target={item.open_in_new_tab ? "_blank" : undefined} rel={item.open_in_new_tab ? "noopener noreferrer" : undefined} className="inline-flex min-h-11 min-w-0 max-w-full items-center text-sm text-slate-300 underline-offset-4 [overflow-wrap:anywhere] hover:text-white hover:underline">{item.label}</Link>;
        })}</nav>
      </div>
    </div>
  </footer>;
}
