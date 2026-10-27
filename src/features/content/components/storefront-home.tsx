"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, CircleHelp, Layers, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchPublicHomepage } from "../api";
import { safeContentUrl, safeImageUrl } from "../safety";
import type { ContentBanner, HomepageContent } from "../types";

const fallback: ContentBanner | null = null;
function colorIfHex(value: string, fallbackColor: string) { return /^#[\da-fA-F]{6}$/.test(value) ? value : fallbackColor; }
function PrimaryBanner({ banner }: { banner: ContentBanner | null }) {
  const title = banner?.title ?? "Discover better, from independent sellers.";
  const subtitle = banner?.subtitle ?? "Shop thoughtful picks from marketplace stores. Simple browsing, secure checkout and a better buying experience.";
  const image = safeImageUrl(banner?.image);
  const mobileImage = safeImageUrl(banner?.mobile_image);
  const href = safeContentUrl(banner?.link_url) ?? "/products";
  const bg = banner ? colorIfHex(banner.background_color, "#0f172a") : "#0f172a";
  const fg = banner ? colorIfHex(banner.text_color, "#ffffff") : "#ffffff";
  return <section className="relative isolate overflow-hidden rounded-[2rem] shadow-xl shadow-slate-200" style={{ backgroundColor: bg, color: fg }}>
    {image && <picture className="absolute inset-0 -z-10"><source media="(max-width: 640px)" srcSet={mobileImage ?? image}/><img src={image} alt="" className="h-full w-full object-cover opacity-35" /></picture>}
    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-transparent" />
    <div className="max-w-3xl px-7 py-20 sm:px-12 sm:py-28"><p className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold tracking-[0.15em] text-white"><Sparkles size={15}/>WELCOME TO MALLBYTE</p><h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">{title}</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-100 sm:text-lg">{subtitle}</p>{banner?.is_clickable !== false && <Link href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="mt-9 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-cyan-50">{banner?.cta_text || "Explore products"}<ArrowRight size={18}/></Link>}</div>
  </section>;
}

export function StorefrontHome() {
  const [data, setData] = useState<HomepageContent | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void fetchPublicHomepage().then((v) => { if (active) setData(v); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  const hero = data?.banners.find((b) => b.placement === "home_hero" && b.is_visible) ?? fallback;
  const notices = data?.announcements.filter((a) => a.is_visible) ?? [];
  const secondaryBanners = data?.banners.filter((b) => b.is_visible && b.id !== hero?.id).slice(0, 4) ?? [];
  const pages = data?.featured_pages.filter((p) => p.is_visible) ?? [];
  const faqs = data?.featured_faqs ?? [];
  return <main className="bg-[#f5f7fa] px-4 pb-20 pt-7 sm:pt-12"><div className="mx-auto max-w-7xl space-y-12">
    {notices.length > 0 && <section aria-label="Announcements" className="space-y-2">{notices.map((notice) => {
      const href = safeContentUrl(notice.link_url);
      return <div key={notice.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-5 py-3 text-sm ${notice.level === "danger" ? "border-rose-200 bg-rose-50 text-rose-800" : notice.level === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-sky-100 bg-sky-50 text-sky-900"}`}><span><strong className="mr-2">{notice.title}</strong>{notice.message}</span>{href && <Link href={href} className="font-bold underline">{notice.link_text || "Learn more"}</Link>}</div>;
    })}</section>}
    <PrimaryBanner banner={hero}/>
    <div className="grid gap-4 md:grid-cols-3">{[
      { title: "Discover the collection", text: "Explore stores, products, prices and styles.", href: "/products", icon: Layers },
      { title: "Marketplace support", text: "Find answers about orders and shopping.", href: "/faq", icon: CircleHelp },
      { title: "Your shopping journey", text: "Manage orders and account activity in one place.", href: "/orders", icon: ShieldCheck },
    ].map(({title,text,href,icon: Icon}) => <Link key={href} href={href} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><div className="mb-7 inline-flex rounded-2xl bg-cyan-50 p-3 text-cyan-800"><Icon size={23}/></div><h2 className="text-lg font-bold text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p><p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">Explore <ArrowRight size={16}/></p></Link>)}</div>
    {secondaryBanners.length > 0 && <section><h2 className="mb-5 text-2xl font-bold tracking-tight text-slate-950">From our marketplace</h2><div className="grid gap-4 sm:grid-cols-2">{secondaryBanners.map((banner) => {
      const img = safeImageUrl(banner.image); const href = safeContentUrl(banner.link_url) ?? "/products";
      return <div key={banner.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><div className="relative h-48 bg-slate-100">{img && <img src={img} alt={banner.title} className="h-full w-full object-cover" />}</div><div className="p-5"><h3 className="font-bold text-slate-950">{banner.title}</h3><p className="mt-2 line-clamp-2 text-sm text-slate-500">{banner.subtitle}</p>{banner.is_clickable && <Link href={href} className="mt-4 inline-block text-sm font-bold text-cyan-700">{banner.cta_text || "Explore"} →</Link>}</div></div>;
    })}</div></section>}
    {pages.length > 0 && <section><h2 className="mb-5 text-2xl font-bold text-slate-950">About MallByte</h2><div className="grid gap-4 sm:grid-cols-3">{pages.map((p) => <Link href={`/pages/${encodeURIComponent(p.slug)}`} key={p.id} className="rounded-3xl border border-slate-200 bg-white p-6 hover:shadow-md"><h3 className="font-bold text-slate-950">{p.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{p.excerpt}</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700">Read more <ArrowRight size={15}/></span></Link>)}</div></section>}
    {faqs.length > 0 && <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold text-slate-950">Frequently asked questions</h2><Link href="/faq" className="text-sm font-semibold text-cyan-700">All FAQs →</Link></div><div className="mt-5 divide-y divide-slate-100">{faqs.slice(0, 5).map((f) => <details key={f.id} className="group py-4"><summary className="cursor-pointer font-semibold text-slate-900">{f.question}</summary><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{f.answer}</p></details>)}</div></section>}
    {error && <p role="status" className="text-center text-xs text-slate-500">Storefront extras are temporarily unavailable. You can still browse products and manage your orders.</p>}
  </div></main>;
}
