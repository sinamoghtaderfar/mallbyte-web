"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPublicNavigation } from "../api";
import { safeContentUrl } from "../safety";
import type { NavigationItem } from "../types";

export function CmsNavLinks({ onNavigate, mobile = false }: { onNavigate?: () => void; mobile?: boolean }) {
  const [items, setItems] = useState<NavigationItem[]>([]);
  useEffect(() => {
    let active = true;
    void fetchPublicNavigation(mobile ? "mobile" : "header")
      .then((menus) => { if (active) setItems(menus.flatMap((m) => m.items).filter((i) => i.is_active && !i.requires_auth)); })
      .catch(() => {});
    return () => { active = false; };
  }, [mobile]);
  const builtIns = new Set(["/", "/products", "/orders", "/support", "/faq", "/profile"]);
  return <>{items.filter((item) => mobile || !builtIns.has(item.url)).slice(0, mobile ? 12 : 3).map((item) => {
    const href = safeContentUrl(item.url);
    return href ? <Link key={item.id} href={href} onClick={onNavigate} target={item.open_in_new_tab ? "_blank" : undefined} rel={item.open_in_new_tab ? "noopener noreferrer" : undefined} className={`rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 ${mobile ? "block" : ""}`}>{item.label}</Link> : null;
  })}</>;
}
