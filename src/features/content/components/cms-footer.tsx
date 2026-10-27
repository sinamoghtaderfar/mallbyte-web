"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPublicNavigation } from "../api";
import { safeContentUrl } from "../safety";
import type { NavigationItem } from "../types";

export function CmsFooter() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  useEffect(() => {
    let active = true;
    void fetchPublicNavigation("footer")
      .then((menus) => { if (active) setItems(menus.flatMap((m) => m.items).filter((i) => i.is_active && !i.requires_auth)); })
      .catch(() => { /* Keep the static fallback footer on public API failures. */ });
    return () => { active = false; };
  }, []);
  const fallback = [{ id: -1, label: "Products", url: "/products", open_in_new_tab: false }, { id: -2, label: "FAQ", url: "/faq", open_in_new_tab: false }, { id: -3, label: "Support", url: "/support", open_in_new_tab: false }];
  const links = items.length ? items : fallback;
  return <footer className="border-t border-slate-200 bg-white px-4 py-9"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-start"><div><Link href="/" className="text-xl font-bold tracking-tight text-slate-950">MallByte</Link><p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Discover, shop and grow on a modern marketplace.</p><p className="mt-4 text-xs text-slate-400">© {new Date().getFullYear()} MallByte</p></div><nav aria-label="Footer links" className="flex flex-wrap gap-x-6 gap-y-3">{links.map((item) => {
      const href = safeContentUrl(item.url);
      return href && <Link key={item.id} href={href} target={item.open_in_new_tab ? "_blank" : undefined} rel={item.open_in_new_tab ? "noopener noreferrer" : undefined} className="text-sm font-medium text-slate-600 hover:text-cyan-700">{item.label}</Link>;
    })}</nav></div></footer>;
}
