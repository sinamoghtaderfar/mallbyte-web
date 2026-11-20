"use client";

/* eslint-disable @next/next/no-img-element */
import { ImageOff, LifeBuoy, PackageCheck, RotateCcw, ShieldCheck } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/page-header";
import { Price, Rating } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/states";
import { getImageUrl } from "@/lib/media/image-url";

import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { ProductReviewsSection } from "@/features/reviews/components/product-reviews-section";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getProduct, trackProductView } from "../api";
import type { ProductDetail as ProductDetailType } from "../types";
import { RelatedProductsSection } from "./related-products-section";

function formatPrice(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function ProductDetail() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getProduct(productId);

        void trackProductView(productId).catch(() => undefined);

        if (isMounted) {
          setProduct(data);
          setActiveImage(0);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  if (isLoading) {
    return (
      <div role="status" className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        <span className="sr-only">Loading product...</span>
        <Skeleton className="aspect-square rounded-3xl" />
        <div className="space-y-4 py-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-rose-50 p-5 sm:p-8 text-center sm:p-10">
        <h1 className="text-xl font-semibold text-rose-900">
          Could not load product
        </h1>
        <p role="alert" className="mt-2 text-sm text-rose-800">{error}</p>

        <Link href="/products" className={buttonStyles({ className: "mt-6" })}>
          Back to products
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-10 text-center">
        <h1 className="text-xl font-semibold text-slate-950">
          Product not found
        </h1>

        <Link href="/products" className={buttonStyles({ className: "mt-6" })}>
          Back to products
        </Link>
      </div>
    );
  }

  const images = [...product.images].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.order - b.order);
  const current = images[Math.min(activeImage, Math.max(0, images.length - 1))];
  const imageUrl = getImageUrl(current?.image);
  const labels = product.label_display.length
    ? product.label_display
    : product.labels;
  const rating = product.average_rating === null || product.average_rating === undefined ? null : Number(product.average_rating);
  const lowStock = product.is_in_stock && product.available_stock <= Math.max(1, product.low_stock_threshold);
  const dimensions = [product.length, product.width, product.height].every(Boolean) ? `${product.length} × ${product.width} × ${product.height}` : null;
  const specs: [string, string][] = [
    ...product.attributes.map((a) => [a.attribute, a.value] as [string, string]),
    ...(product.weight ? [["Weight", product.weight] as [string, string]] : []),
    ...(dimensions ? [["Dimensions (L × W × H)", dimensions] as [string, string]] : []),
  ];

  return (
    <div>
      <Breadcrumbs className="mb-6 sm:mb-8" items={[
        { href: "/", label: "Home" },
        { href: "/products", label: "Products" },
        ...(product.category && product.category_name ? [{ href: `/products?category=${product.category}`, label: product.category_name }] : []),
        { label: product.name },
      ]} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        <section aria-label="Product images" className="min-w-0 lg:sticky lg:top-36 lg:self-start">
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {images.length > 1 ? (
              <div className="mb-scrollbar-none flex gap-3 overflow-x-auto sm:w-20 sm:shrink-0 sm:flex-col sm:overflow-visible">
                {images.slice(0, 6).map((image, index) => {
                  const thumbnailUrl = getImageUrl(image.image);
                  const selected = image.id === current?.id;
                  return (
                    <button
                      type="button"
                      key={image.id}
                      onClick={() => setActiveImage(index)}
                      aria-pressed={selected}
                      aria-label={`Show image ${index + 1} of ${images.length}`}
                      className={`aspect-square w-20 shrink-0 overflow-hidden rounded-xl bg-sunken ring-offset-2 ring-offset-background transition ${selected ? "ring-2 ring-ink" : "opacity-75 ring-1 ring-line hover:opacity-100"}`}
                    >
                      {thumbnailUrl ? <img src={thumbnailUrl} alt="" className="size-full object-cover" /> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-3xl bg-sunken">
              {imageUrl ? (
                <img src={imageUrl} alt={current?.alt_text || product.name} fetchPriority="high" className="size-full object-cover" />
              ) : (
                <span className="flex size-full flex-col items-center justify-center gap-2 text-sm font-medium text-slate-500">
                  <ImageOff size={28} strokeWidth={1.4} aria-hidden="true" />No image
                </span>
              )}
              {product.is_featured || labels.length ? (
                <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
                  {product.is_featured ? (
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">
                      Featured
                    </span>
                  ) : null}
                  {labels.slice(0, 3).map((label) => (
                    <span key={label} className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-800 backdrop-blur">
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section aria-label="Product summary" className="min-w-0">
          <p className="text-sm font-medium text-muted">
            {product.brand_name || "Unknown brand"}
            {product.category_name ? ` · ${product.category_name}` : ""}
          </p>

          <h1 className="mb-display mt-3 text-[2.5rem] text-ink sm:text-[3.25rem]">
            {product.name}
          </h1>

          <a href="#reviews" className="mt-4 inline-flex min-h-8 items-center gap-2 rounded-md text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
            <Rating value={rating} />
            <span>{rating ? rating.toFixed(1) : "No ratings yet"}{product.reviews_count ? ` · ${product.reviews_count} review${product.reviews_count === 1 ? "" : "s"}` : ""}</span>
          </a>

          <div className="mt-7 border-t border-line pt-7">
            <Price value={product.final_price || product.price} compare={product.compare_price} size="xl" />
            <p className={`mt-3 inline-flex items-center gap-2 text-sm font-medium ${product.is_in_stock ? (lowStock ? "text-amber-800" : "text-emerald-700") : "text-rose-700"}`}>
              <span className={`size-2 rounded-full ${product.is_in_stock ? (lowStock ? "bg-amber-500" : "bg-emerald-500") : "bg-rose-500"}`} aria-hidden="true" />
              {product.is_in_stock
                ? `${product.available_stock} available`
                : "Out of stock"}
            </p>
          </div>

          {product.short_description ? (
            <p className="mt-6 text-[1.0625rem] leading-8 text-slate-600">
              {product.short_description}
            </p>
          ) : null}

          {product.variants.length ? (
            <div className="mt-7">
              <h2 className="text-sm font-semibold text-ink">Options offered by the seller</h2>
              <p className="mt-1 text-xs text-muted">Shown for reference. Checkout adds the product as listed.</p>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {product.variants.map((variant) => (
                  <li key={variant.id} className={`rounded-xl border px-3 py-2.5 ${variant.stock > 0 ? "border-line-strong/80 bg-surface" : "border-dashed border-line bg-transparent text-slate-500"}`}>
                    <p className="text-sm font-semibold text-slate-950">{variant.name}</p>
                    <p data-numeric className="mt-0.5 text-xs text-muted">{formatPrice(variant.final_price || variant.price)} · {variant.stock > 0 ? `Stock: ${variant.stock}` : "Sold out"}</p>
                    <p className="sr-only">SKU: {variant.sku}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
            <AddToCartButton
              productId={product.id}
              disabled={!product.is_in_stock}
            />

            <WishlistButton productId={product.id} />
          </div>

          <ul className="mt-7 grid gap-3 rounded-2xl bg-sunken/70 p-5 text-sm text-slate-700 sm:grid-cols-3 sm:gap-4">
            <li className="flex items-center gap-2.5"><ShieldCheck size={17} strokeWidth={1.7} className="shrink-0 text-ink" aria-hidden="true" />Secure checkout</li>
            <li className="flex items-center gap-2.5"><PackageCheck size={17} strokeWidth={1.7} className="shrink-0 text-ink" aria-hidden="true" />Tracked shipping</li>
            <li className="flex items-center gap-2.5"><RotateCcw size={17} strokeWidth={1.7} className="shrink-0 text-ink" aria-hidden="true" />Returns via account</li>
          </ul>

          <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
            {[
              ["Seller", product.seller_name || product.seller_email || "—"],
              ["SKU", product.sku || "—"],
              ["Rating", `${product.average_rating ?? "—"} / 5`],
              ["Reviews", String(product.reviews_count)],
              ["Popularity", `${product.views_count} views`],
            ].map(([term, detail]) => (
              <div key={term} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted">{term}</dt>
                <dd className="min-w-0 text-right font-medium text-slate-900 [overflow-wrap:anywhere]">{detail}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href="/recently-viewed" className="inline-flex min-h-11 items-center text-muted underline-offset-4 hover:text-ink hover:underline">
              Recently viewed
            </Link>
            <Link href="/support" className="inline-flex min-h-11 items-center gap-1.5 text-muted underline-offset-4 hover:text-ink hover:underline">
              <LifeBuoy size={15} aria-hidden="true" />Questions? Contact support
            </Link>
            <Link href="/products" className="inline-flex min-h-11 items-center text-muted underline-offset-4 hover:text-ink hover:underline">
              Back to products
            </Link>
          </div>
        </section>
      </div>

      <div className="mt-20 grid gap-10 border-t border-line pt-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
        <section>
          <h2 className="mb-display text-[2rem] text-ink">Description</h2>
          <p className="mt-5 max-w-prose whitespace-pre-line text-base leading-8 text-slate-600">
            {product.description || "No description available."}
          </p>
        </section>

        {specs.length ? (
          <section>
            <h2 className="mb-display text-[2rem] text-ink">{product.attributes.length ? "Attributes" : "Specifications"}</h2>
            <dl className="mt-5 divide-y divide-line border-y border-line text-sm">
              {specs.map(([term, detail]) => (
                <div key={`${term}-${detail}`} className="grid grid-cols-2 gap-4 py-3">
                  <dt className="text-muted">{term}</dt>
                  <dd className="font-medium text-slate-900">{detail}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>

      <div id="reviews" className="mt-20 scroll-mt-36">
        <ProductReviewsSection productId={product.id} />
      </div>

      <div className="mt-20">
        <RelatedProductsSection productId={product.id} />
      </div>
    </div>
  );
}
