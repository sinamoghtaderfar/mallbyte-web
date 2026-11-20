/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ImageOff } from "lucide-react";

import { discountPercent, Price } from "@/components/ui/price";
import { getImageUrl } from "@/lib/media/image-url";

import type { ProductListItem } from "../types";

type ProductCardProps = {
  product: ProductListItem;
  /** Above-the-fold cards load eagerly; the rest stay lazy. */
  priority?: boolean;
};

function stockLabel(available: number) {
  if (available <= 0) return { text: "Sold out", tone: "text-rose-700" };
  if (available <= 5) return { text: `Only ${available} left`, tone: "text-amber-800" };
  return { text: "In stock", tone: "text-emerald-700" };
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const imageUrl = getImageUrl(product.main_image);
  const labels = product.label_display.length
    ? product.label_display
    : product.labels;
  const price = product.final_price || product.price;
  const off = discountPercent(price, product.compare_price);
  const stock = stockLabel(product.available_stock);
  const shownLabels = labels.filter((label) => !(off > 0 && /^(sale|discount(ed)?)$/i.test(label))).slice(0, 2);

  return (
    <article className="group relative min-w-0">
      <Link href={`/products/${product.id}`} className="block rounded-2xl focus-visible:outline-offset-4">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sunken ring-1 ring-inset ring-black/[0.04]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              width={600}
              height={750}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
            />
          ) : (
            <span className="flex size-full flex-col items-center justify-center gap-2 text-sm font-medium text-slate-500">
              <ImageOff size={22} strokeWidth={1.5} aria-hidden="true" />
              No image
            </span>
          )}
          <div className="absolute inset-x-3 top-3 flex flex-wrap items-start gap-1.5">
            {off > 0 ? (
              <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-white">−{off}%</span>
            ) : null}
            {product.is_featured ? (
              <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white">
                Featured
              </span>
            ) : null}
            {shownLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-800 shadow-xs backdrop-blur"
              >
                {label}
              </span>
            ))}
          </div>
          {product.available_stock <= 0 ? (
            <span className="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 py-2 text-center text-xs font-semibold text-slate-800 backdrop-blur">Currently unavailable</span>
          ) : null}
        </div>

        <div className="px-0.5 pt-3.5">
          <p className="truncate text-xs font-medium text-muted">
            {product.brand_name || "Unknown brand"}
            {product.category_name ? ` · ${product.category_name}` : ""}
          </p>
          <h2 className="mt-1 line-clamp-2 text-[0.9375rem] font-medium leading-snug tracking-[-0.01em] text-foreground decoration-slate-300 underline-offset-4 group-hover:underline">
            {product.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
            <Price value={price} compare={product.compare_price} />
            <p className={`text-xs font-medium ${stock.tone}`}>{stock.text}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ProductCardSkeleton() {
  return <div aria-hidden="true" className="min-w-0">
    <div className="mb-skeleton aspect-[4/5] rounded-2xl" />
    <div className="mb-skeleton mt-4 h-3 w-1/3" />
    <div className="mb-skeleton mt-2.5 h-4 w-4/5" />
    <div className="mb-skeleton mt-3 h-4 w-1/4" />
  </div>;
}
