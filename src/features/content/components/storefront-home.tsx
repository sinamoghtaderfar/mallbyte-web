"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, ArrowUpRight, LifeBuoy, PackageCheck, RotateCcw, ShieldCheck, Store } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import { getProducts, getStorefrontCategories } from "@/features/products/api";
import { ProductCard, ProductCardSkeleton } from "@/features/products/components/product-card";
import type { ProductCategory, ProductListItem } from "@/features/products/types";
import { getImageUrl } from "@/lib/media/image-url";
import { fetchPublicHomepage } from "../api";
import { safeContentUrl, safeImageUrl } from "../safety";
import type { ContentAnnouncement, ContentBanner, HomepageContent } from "../types";

function colorIfHex(value: string | undefined, fallbackColor: string) { return value && /^#[\da-fA-F]{6}$/.test(value) ? value : fallbackColor; }
function external(href: string) { return href.startsWith("http"); }

function AnnouncementStrip({ notices }: { notices: ContentAnnouncement[] }) {
  if (!notices.length) return null;
  return <section aria-label="Announcements" className="border-b border-line">
    {notices.map((notice) => {
      const href = safeContentUrl(notice.link_url);
      const tone = notice.level === "danger" ? "bg-rose-50 text-rose-900" : notice.level === "warning" ? "bg-amber-50 text-amber-950" : notice.level === "success" ? "bg-emerald-50 text-emerald-950" : "bg-ink text-white";
      return <div key={notice.id} className={`px-4 py-2.5 text-center text-[0.8125rem] leading-5 ${tone}`}>
        <strong className="font-semibold">{notice.title}</strong><span className="mx-2 opacity-40" aria-hidden="true">·</span><span className="opacity-90">{notice.message}</span>
        {href && <Link href={href} className="ml-3 inline-flex items-center gap-1 font-medium underline underline-offset-4">{notice.link_text || "Learn more"}<ArrowRight size={13} aria-hidden="true" /></Link>}
      </div>;
    })}
  </section>;
}

function Hero({ banner, loading, spotlight }: { banner: ContentBanner | null; loading: boolean; spotlight: ProductListItem[] }) {
  const title = banner?.title ?? "Discover better, from independent sellers.";
  const subtitle = banner?.subtitle ?? "Shop thoughtful picks from marketplace stores. Simple browsing, secure checkout and a better buying experience.";
  const image = safeImageUrl(banner?.image);
  const mobileImage = safeImageUrl(banner?.mobile_image);
  const href = safeContentUrl(banner?.link_url) ?? "/products";
  const panel = colorIfHex(banner?.background_color, "#e9e4da");
  const [first, ...rest] = title.split(" ");
  return <section className="mb-container pt-8 sm:pt-12 lg:pt-14">
    <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:gap-14">
      <div className="flex flex-col justify-center py-4 lg:py-10">
        <p className="mb-eyebrow flex items-center gap-2"><span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />Welcome to MallByte</p>
        {loading && !banner
          ? <div aria-hidden="true" className="mt-6 space-y-3"><div className="mb-skeleton h-16 w-11/12" /><div className="mb-skeleton h-16 w-3/4" /></div>
          : <h1 className="mb-display mt-6 text-[3.25rem] text-ink sm:text-[4.5rem] xl:text-[5.5rem]">{first} <span className="italic">{rest.join(" ")}</span></h1>}
        <p className="mt-6 max-w-lg text-[1.0625rem] leading-8 text-slate-600">{subtitle}</p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          {banner?.is_clickable !== false && <Link href={href} target={external(href) ? "_blank" : undefined} rel={external(href) ? "noopener noreferrer" : undefined} className={buttonStyles({ size: "large", className: "rounded-full pl-7 pr-6" })}>{banner?.cta_text || "Explore products"}<ArrowRight size={18} aria-hidden="true" /></Link>}
          <Link href="#categories" className={buttonStyles({ variant: "secondary", size: "large", className: "rounded-full" })}>Shop by category</Link>
        </div>
        <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6 text-sm">
          {[["Secure", "checkout"], ["Tracked", "deliveries"], ["Simple", "returns"]].map(([a, b]) => <div key={a}><dt className="font-semibold text-ink">{a}</dt><dd className="text-muted">{b}</dd></div>)}
        </dl>
      </div>
      <div className="relative isolate min-h-[22rem] overflow-hidden rounded-[1.75rem] sm:min-h-[30rem]" style={{ backgroundColor: panel }}>
        {image && <picture className="absolute inset-0 -z-10"><source media="(max-width: 640px)" srcSet={mobileImage ?? image} /><img src={image} alt="" fetchPriority="high" className="size-full object-cover" /></picture>}
        {!image && !loading && <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,#fff_0,transparent_55%)]" />}
        {spotlight.length > 0 && <div className="absolute inset-x-4 bottom-4 hidden gap-2 sm:grid sm:left-auto sm:right-5 sm:bottom-5 sm:w-80">
          {spotlight.slice(0, 2).map((product) => {
            const img = getImageUrl(product.main_image);
            return <Link key={product.id} href={`/products/${product.id}`} className="group flex items-center gap-3 rounded-2xl bg-white/90 p-2.5 pr-4 shadow-lg backdrop-blur-md transition hover:bg-white">
              <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-sunken">{img && <img src={img} alt="" className="size-full object-cover" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{product.name}</span><span data-numeric className="text-sm text-muted">{Number(product.final_price || product.price).toLocaleString("en-US")}</span></span>
              <ArrowUpRight size={16} className="shrink-0 text-slate-500 transition group-hover:text-ink" aria-hidden="true" />
            </Link>;
          })}
        </div>}
      </div>
    </div>
  </section>;
}

function SectionHeading({ eyebrow, title, action, id }: { eyebrow?: string; title: ReactNode; action?: ReactNode; id?: string }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>{eyebrow && <p className="mb-eyebrow mb-3">{eyebrow}</p>}<h2 id={id} className="mb-display text-[2.25rem] text-ink sm:text-[2.75rem]">{title}</h2></div>
    {action}
  </div>;
}

function ViewAll({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline">{children}<ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>;
}

function ProductRail({ products, loading, failed, count = 4 }: { products: ProductListItem[]; loading: boolean; failed: boolean; count?: number }) {
  if (failed) return <p role="status" className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">These products are temporarily unavailable. <Link href="/products" className="font-medium text-ink underline underline-offset-4">Browse the full catalog</Link>.</p>;
  const grid = "mb-scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4";
  const item = "w-[68%] shrink-0 snap-start sm:w-auto";
  if (loading) return <div className={grid} role="status"><span className="sr-only">Loading products…</span>{Array.from({ length: count }, (_, i) => <div key={i} className={item}><ProductCardSkeleton /></div>)}</div>;
  if (!products.length) return null;
  return <div className={grid}>{products.slice(0, count).map((product) => <div key={product.id} className={item}><ProductCard product={product} /></div>)}</div>;
}

type Feed = { items: ProductListItem[]; loading: boolean; failed: boolean };
const emptyFeed: Feed = { items: [], loading: true, failed: false };

function useFeed(params: Parameters<typeof getProducts>[0]): Feed {
  const [feed, setFeed] = useState<Feed>(emptyFeed);
  const key = JSON.stringify(params);
  useEffect(() => {
    let active = true;
    void getProducts(JSON.parse(key))
      .then((data) => { if (active) setFeed({ items: data.results, loading: false, failed: false }); })
      .catch(() => { if (active) setFeed({ items: [], loading: false, failed: true }); });
    return () => { active = false; };
  }, [key]);
  return feed;
}

export function StorefrontHome() {
  const [data, setData] = useState<HomepageContent | null>(null);
  const [error, setError] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[] | null>(null);
  const featured = useFeed({ is_featured: "true", page_size: "8" });
  const arrivals = useFeed({ ordering: "-created_at", page_size: "8" });
  const deals = useFeed({ has_discount: "true", page_size: "4" });
  useEffect(() => {
    let active = true;
    void fetchPublicHomepage().then((v) => { if (active) setData(v); }).catch(() => { if (active) setError(true); });
    const controller = new AbortController();
    void getStorefrontCategories(controller.signal).then((c) => { if (active) setCategories(c); }).catch(() => { if (active) setCategories([]); });
    return () => { active = false; controller.abort(); };
  }, []);
  const hero = data?.banners.find((b) => b.placement === "home_hero" && b.is_visible) ?? null;
  const notices = data?.announcements.filter((a) => a.is_visible) ?? [];
  const secondaryBanners = data?.banners.filter((b) => b.is_visible && b.id !== hero?.id).slice(0, 4) ?? [];
  const pages = data?.featured_pages.filter((p) => p.is_visible) ?? [];
  const faqs = data?.featured_faqs ?? [];
  const loadingContent = !data && !error;

  return <main className="pb-24">
    <AnnouncementStrip notices={notices} />
    <Hero banner={hero} loading={loadingContent} spotlight={featured.items} />

    <section aria-label="Why shop on MallByte" className="mb-container mt-16">
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
        {[
          { icon: ShieldCheck, title: "Secure checkout", text: "Payments are confirmed before an order is fulfilled." },
          { icon: PackageCheck, title: "Order tracking", text: "Follow every shipment from your order history." },
          { icon: RotateCcw, title: "Straightforward returns", text: "Request a return for eligible orders from your account." },
          { icon: LifeBuoy, title: "Real support", text: "Open a ticket and follow the conversation in one place." },
        ].map(({ icon: Icon, title, text }) => <li key={title} className="flex flex-col gap-3 bg-surface p-4 sm:flex-row sm:gap-4 sm:p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-ink" aria-hidden="true"><Icon size={19} strokeWidth={1.7} /></span>
          <div><p className="text-sm font-semibold text-ink">{title}</p><p className="mt-1 hidden text-sm leading-6 text-muted sm:block">{text}</p></div>
        </li>)}
      </ul>
    </section>

    {categories === null || categories.length > 0 ? <section aria-labelledby="categories" className="mb-container mt-24 scroll-mt-40">
      <SectionHeading eyebrow="Browse" title={<>Shop by <span className="italic">category</span></>} id="categories" action={<ViewAll href="/products">All products</ViewAll>} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {categories === null
          ? Array.from({ length: 8 }, (_, i) => <div key={i} className="mb-skeleton aspect-[5/4] rounded-2xl" aria-hidden="true" />)
          : categories.slice(0, 9).map((category, index, shown) => {
            const feature = index === 0 && (shown.length === 5 || shown.length === 9);
            const img = getImageUrl(category.image);
            return <Link key={category.id} href={`/products?category=${category.id}`} className={`group relative isolate flex aspect-[5/4] flex-col justify-end overflow-hidden rounded-2xl bg-sunken p-4 sm:p-5 ${feature ? "md:col-span-2 md:row-span-2 md:aspect-auto" : ""}`}>
              {img && <img src={img} alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover transition-transform duration-700 group-hover:scale-105" />}
              <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/45 via-black/5 to-transparent" aria-hidden="true" />
              <span className="flex items-end justify-between gap-2 text-white">
                <span className={`font-medium leading-tight tracking-tight ${feature ? "mb-display text-[2rem] sm:text-[2.5rem]" : "text-[0.9375rem] sm:text-base"}`}>{category.name}</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition group-hover:bg-white group-hover:text-ink" aria-hidden="true"><ArrowUpRight size={15} /></span>
              </span>
            </Link>;
          })}
      </div>
    </section> : null}

    {(featured.loading || featured.items.length > 0 || featured.failed) && <section aria-labelledby="featured-heading" className="mb-container mt-24">
      <SectionHeading eyebrow="Curated" title={<>Featured <span className="italic">this week</span></>} id="featured-heading" action={<ViewAll href="/products">Shop all</ViewAll>} />
      <ProductRail {...featured} products={featured.items} count={4} />
    </section>}

    {secondaryBanners.length > 0 && <section aria-label="From our marketplace" className="mb-container mt-24 grid gap-4 md:grid-cols-2">
      {secondaryBanners.map((banner) => {
        const img = safeImageUrl(banner.image); const href = safeContentUrl(banner.link_url) ?? "/products";
        const body = <>
          <div className="relative aspect-[16/11] overflow-hidden rounded-2xl" style={{ backgroundColor: colorIfHex(banner.background_color, "#e9e4da") }}>{img && <img src={img} alt={banner.title} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />}</div>
          <div className="flex items-end justify-between gap-4 pt-5">
            <div className="min-w-0"><h3 className="mb-display text-[1.875rem] text-ink">{banner.title}</h3>{banner.subtitle && <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{banner.subtitle}</p>}</div>
            {banner.is_clickable && <span className={buttonStyles({ variant: "secondary", size: "small", className: "shrink-0 rounded-full" })}>{banner.cta_text || "Explore"}<ArrowRight size={15} aria-hidden="true" /></span>}
          </div>
        </>;
        return banner.is_clickable
          ? <Link key={banner.id} href={href} target={external(href) ? "_blank" : undefined} rel={external(href) ? "noopener noreferrer" : undefined} className="group block rounded-2xl">{body}</Link>
          : <div key={banner.id}>{body}</div>;
      })}
    </section>}

    <section aria-labelledby="arrivals-heading" className="mb-container mt-24">
      <SectionHeading eyebrow="Just in" title={<>New <span className="italic">arrivals</span></>} id="arrivals-heading" action={<ViewAll href="/products?ordering=-created_at">See what&apos;s new</ViewAll>} />
      <ProductRail {...arrivals} products={arrivals.items} count={8} />
    </section>

    {(deals.loading || deals.items.length > 0) && !deals.failed && <section aria-labelledby="deals-heading" className="mt-24 bg-ember-50/70 py-20">
      <div className="mb-container">
        <SectionHeading eyebrow="Price drops" title={<>Quietly <span className="italic">reduced</span></>} id="deals-heading" action={<ViewAll href="/products?has_discount=true">All offers</ViewAll>} />
        <ProductRail {...deals} products={deals.items} count={4} />
      </div>
    </section>}

    <section className="mb-container mt-24">
      <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-ink px-6 py-14 text-white sm:px-12 sm:py-16 lg:flex lg:items-center lg:justify-between lg:gap-12">
        <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 size-96 rounded-full bg-brand/30 blur-3xl" />
        <div className="max-w-xl">
          <p className="mb-eyebrow text-slate-400">Sell on MallByte</p>
          <h2 className="mb-display mt-4 text-[2.5rem] sm:text-[3.25rem]">Open your store to <span className="italic text-ember-300">considered</span> shoppers.</h2>
          <p className="mt-4 text-[0.9375rem] leading-7 text-slate-300">Apply as a seller, list your products and manage orders, returns and payouts from one workspace.</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
          <Link href="/seller/apply" className={buttonStyles({ variant: "inverse", size: "large", className: "rounded-full" })}><Store size={18} aria-hidden="true" />Become a seller</Link>
          <Link href="/faq" className={buttonStyles({ variant: "quiet", size: "large", className: "rounded-full text-white hover:bg-white/10 hover:text-white" })}>Learn more</Link>
        </div>
      </div>
    </section>

    {(pages.length > 0 || faqs.length > 0) && <section className="mb-container mt-24 grid gap-12 lg:grid-cols-[1fr_1.4fr]">
      {pages.length > 0 ? <div>
        <SectionHeading eyebrow="About" title={<>The <span className="italic">MallByte</span> way</>} />
        <div className="space-y-3">{pages.map((p) => <Link href={`/pages/${encodeURIComponent(p.slug)}`} key={p.id} className="group flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-line-strong hover:shadow-md"><span><span className="block font-semibold text-ink">{p.title}</span>{p.excerpt && <span className="mt-1 block text-sm leading-6 text-muted">{p.excerpt}</span>}</span><ArrowUpRight size={18} className="mt-0.5 shrink-0 text-slate-400 transition group-hover:text-ink" aria-hidden="true" /></Link>)}</div>
      </div> : <div />}
      {faqs.length > 0 && <div>
        <SectionHeading eyebrow="Help" title={<>Good to <span className="italic">know</span></>} action={<ViewAll href="/faq">All FAQs</ViewAll>} />
        <div className="divide-y divide-line border-y border-line">{faqs.slice(0, 5).map((f) => <details key={f.id} className="group py-1">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">{f.question}<span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-lg leading-none text-slate-500 transition group-open:rotate-45" aria-hidden="true">+</span></summary>
          <p className="pb-5 pr-10 text-sm leading-7 whitespace-pre-line text-slate-600">{f.answer}</p>
        </details>)}</div>
      </div>}
    </section>}

    {error && <p role="status" className="mb-container mt-10 text-center text-xs text-slate-500">Storefront extras are temporarily unavailable. You can still browse products and manage your orders.</p>}
  </main>;
}
