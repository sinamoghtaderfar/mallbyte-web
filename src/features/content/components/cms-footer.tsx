"use client";

import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { useEffect, useState } from "react";
import { fetchPublicNavigation } from "../api";
import { safeContentUrl } from "../safety";
import { publicNavigationItems } from "../navigation";
import type { NavigationItem } from "../types";

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
  return <footer className="border-t border-line bg-white px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 sm:flex-row sm:items-start"><div><Brand /><p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Discover, shop and grow on a modern marketplace.</p><p className="mt-4 text-xs text-muted">© {new Date().getFullYear()} MallByte. All rights reserved.</p></div><nav aria-label="Footer links" className="flex max-w-2xl flex-wrap gap-x-5 gap-y-1">{links.map((item) => {
      const href = safeContentUrl(item.url);
      return href && <Link key={item.id} href={href} target={item.open_in_new_tab ? "_blank" : undefined} rel={item.open_in_new_tab ? "noopener noreferrer" : undefined} className="inline-flex min-h-11 min-w-0 max-w-full items-center [overflow-wrap:anywhere] text-sm font-medium text-muted underline-offset-4 hover:text-brand hover:underline">{item.label}</Link>;
    })}</nav></div></footer>;
}
