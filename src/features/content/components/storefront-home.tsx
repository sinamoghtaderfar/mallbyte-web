"use client";

/* Published CMS media supports external origins as well as relative paths. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CircleHelp, Layers, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fetchPublicHomepage } from "../api";
import { safeContentUrl, safeImageUrl } from "../safety";
import type { ContentBanner, HomepageContent } from "../types";

function colorIfHex(value: string, fallback: string) {
  return /^#[\da-fA-F]{6}$/.test(value) ? value : fallback;
}

function externalLinkProps(href: string) {
  return href.startsWith("http")
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
}

const discoveryLinks = [
  {
    title: "New arrivals",
    description: "Fresh additions to the marketplace",
    href: "/products?label=new",
  },
  {
    title: "Bestsellers",
    description: "Explore the bestseller collection",
    href: "/products?label=bestseller",
  },
  {
    title: "Limited editions",
    description: "Find something a little different",
    href: "/products?label=limited",
  },
];

function PrimaryBanner({ banner }: { banner: ContentBanner | null }) {
  const image = safeImageUrl(banner?.image);
  const mobileImage = safeImageUrl(banner?.mobile_image);
  const href = safeContentUrl(banner?.link_url) ?? "/products";
  return (
    <section
      aria-label="Welcome to MallByte"
      className="grid overflow-hidden rounded-2xl border border-line bg-surface md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
      style={
        banner
          ? {
              backgroundColor: colorIfHex(banner.background_color, "#ffffff"),
              color: colorIfHex(banner.text_color, "#17252f"),
            }
          : undefined
      }
    >
      <div className="flex flex-col items-start justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-12 lg:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em]">
          The independent marketplace
        </p>
        <h1 className="mt-5 max-w-2xl break-words text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.5rem]">
          {banner?.title ?? "Everyday discoveries. Independent perspectives."}
        </h1>
        <p className="mt-5 max-w-lg break-words text-base leading-7 opacity-85">
          {banner?.subtitle ??
            "Thoughtful products, distinctive stores and something you’ll love making part of your everyday."}
        </p>
        {banner?.is_clickable !== false && (
          <Link
            href={href}
            {...externalLinkProps(href)}
            className={buttonStyles({ className: "mt-7" })}
          >
            {banner?.cta_text || "Explore products"}
          </Link>
        )}
      </div>
      {image ? (
        <picture className="relative block min-h-64 md:min-h-full">
          <source media="(max-width: 640px)" srcSet={mobileImage ?? image} />
          <img
            src={image}
            alt={banner?.title ?? ""}
            width={1000}
            height={800}
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      ) : (
        <div className="flex flex-col justify-center bg-brand-soft px-6 py-8 sm:px-10 md:border-l md:border-line lg:px-12">
          <ShoppingBag
            size={27}
            strokeWidth={1.5}
            aria-hidden="true"
            className="text-brand"
          />
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
            Where will you start?
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            A few ways to find your next favorite.
          </p>
          <nav
            aria-label="Discover collections"
            className="mt-5 divide-y divide-line"
          >
            {discoveryLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex min-h-20 items-center justify-between gap-3 py-4"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground group-hover:text-brand">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {item.description}
                  </span>
                </span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </section>
  );
}

export function StorefrontHome() {
  const [data, setData] = useState<HomepageContent | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void fetchPublicHomepage()
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const hero =
    data?.banners.find(
      (banner) => banner.placement === "home_hero" && banner.is_visible,
    ) ?? null;
  const notices =
    data?.announcements.filter((notice) => notice.is_visible) ?? [];
  const secondaryBanners =
    data?.banners
      .filter((banner) => banner.is_visible && banner.id !== hero?.id)
      .slice(0, 4) ?? [];
  const pages = data?.featured_pages.filter((page) => page.is_visible) ?? [];
  const faqs = data?.featured_faqs ?? [];

  return (
    <main className="px-4 pb-14 pt-6 sm:px-6 sm:pb-20 sm:pt-9">
      <div className="mx-auto max-w-7xl space-y-9 sm:space-y-12">
        {notices.length > 0 && (
          <section aria-label="Announcements" className="space-y-2">
            {notices.map((notice) => {
              const href = safeContentUrl(notice.link_url);
              const color =
                notice.level === "danger"
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : notice.level === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : notice.level === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-line bg-brand-soft text-foreground";
              return (
                <div
                  key={notice.id}
                  className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border px-4 py-3 text-sm leading-6 ${color}`}
                >
                  <p className="min-w-0 break-words">
                    <strong className="mr-2 font-semibold">
                      {notice.title}
                    </strong>
                    {notice.message}
                  </p>
                  {href && (
                    <Link
                      href={href}
                      {...externalLinkProps(href)}
                      className="min-h-6 font-semibold underline underline-offset-4"
                    >
                      {notice.link_text || "Learn more"}
                    </Link>
                  )}
                </div>
              );
            })}
          </section>
        )}
        <PrimaryBanner banner={hero} />
        <section
          aria-label="Make the most of MallByte"
          className="grid divide-y divide-line rounded-xl border border-line bg-surface md:grid-cols-3 md:divide-x md:divide-y-0"
        >
          {[
            {
              title: "Discover the collection",
              text: "Explore products, stores and new possibilities.",
              href: "/products",
              icon: Layers,
            },
            {
              title: "Marketplace support",
              text: "Find answers about orders and shopping.",
              href: "/faq",
              icon: CircleHelp,
            },
            {
              title: "Your shopping journey",
              text: "Keep orders and account activity in one place.",
              href: "/orders",
              icon: ShoppingBag,
            },
          ].map(({ title, text, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-w-0 items-start gap-4 p-5 sm:p-6"
            >
              <Icon
                size={22}
                strokeWidth={1.5}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-brand"
              />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground group-hover:text-brand">
                  {title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
              </div>
            </Link>
          ))}
        </section>
        {secondaryBanners.length > 0 && (
          <section aria-labelledby="marketplace-stories-heading">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h2
                id="marketplace-stories-heading"
                className="text-2xl font-semibold tracking-tight text-foreground"
              >
                From our marketplace
              </h2>
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"
              >
                Explore products
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {secondaryBanners.map((banner) => {
                const image = safeImageUrl(banner.image);
                const href = safeContentUrl(banner.link_url) ?? "/products";
                return (
                  <article
                    key={banner.id}
                    className="overflow-hidden rounded-xl border border-line bg-surface"
                  >
                    {image && (
                      <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                        <img
                          src={image}
                          alt={banner.title}
                          width={800}
                          height={450}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-5 sm:p-6">
                      <h3 className="break-words text-xl font-semibold tracking-tight text-foreground">
                        {banner.title}
                      </h3>
                      <p className="mt-2 break-words text-sm leading-6 text-muted">
                        {banner.subtitle}
                      </p>
                      {banner.is_clickable && (
                        <Link
                          href={href}
                          {...externalLinkProps(href)}
                          className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"
                        >
                          {banner.cta_text || "Explore"}
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {pages.length > 0 && (
          <section
            aria-labelledby="about-mallbyte-heading"
            className="border-t border-line pt-8 sm:pt-10"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              A little more about us
            </p>
            <h2
              id="about-mallbyte-heading"
              className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
            >
              About MallByte
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {pages.map((page) => (
                <Link
                  href={`/pages/${encodeURIComponent(page.slug)}`}
                  key={page.id}
                  className="group min-w-0 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-slate-400 sm:p-6"
                >
                  <h3 className="break-words text-base font-semibold text-foreground group-hover:text-brand">
                    {page.title}
                  </h3>
                  <p className="mt-2 break-words text-sm leading-6 text-muted">
                    {page.excerpt}
                  </p>
                  <span className="mt-5 inline-flex min-h-6 items-center gap-2 text-sm font-semibold text-brand">
                    Read more
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
        {faqs.length > 0 && (
          <section
            aria-labelledby="home-faq-heading"
            className="grid gap-5 border-t border-line pt-8 sm:pt-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                Here to help
              </p>
              <h2
                id="home-faq-heading"
                className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
              >
                Frequently asked questions
              </h2>
              <Link
                href="/faq"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"
              >
                All FAQs
              </Link>
            </div>
            <div className="divide-y divide-line">
              {faqs.slice(0, 5).map((faq) => (
                <details key={faq.id} className="group py-2">
                  <summary className="min-h-11 cursor-pointer break-words py-3 pr-3 text-sm font-semibold leading-6 text-foreground">
                    {faq.question}
                  </summary>
                  <p className="max-w-prose whitespace-pre-line break-words pb-4 text-sm leading-7 text-muted">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}
        {error && (
          <p role="status" className="text-sm leading-6 text-muted">
            Storefront extras are temporarily unavailable. You can still browse
            products and manage your orders.
          </p>
        )}
      </div>
    </main>
  );
}
