import { getImageUrl } from "@/lib/media/image-url";
import Link from "next/link";
import type { ProductListItem } from "../types";
import { ProductImage } from "./product-image";

function formatPrice(value: string) {
  const amount = Number(value);
  return Number.isNaN(amount)
    ? value
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
        amount,
      );
}

export function ProductCard({ product }: { product: ProductListItem }) {
  const labels = product.label_display.length
    ? product.label_display
    : product.labels;
  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-slate-400">
      <Link
        href={`/products/${product.id}`}
        className="flex h-full flex-col rounded-xl"
      >
        <div className="aspect-square overflow-hidden bg-[#f0efeb]">
          <ProductImage
            src={getImageUrl(product.main_image)}
            alt={product.name}
            className="h-full w-full object-contain p-3 sm:p-5"
          />
        </div>
        <div className="flex flex-1 flex-col p-3.5 sm:p-5">
          {(product.is_featured || labels.length > 0) && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {product.is_featured && (
                <span className="rounded bg-brand-soft px-2 py-1 text-xs font-semibold text-brand">
                  Featured
                </span>
              )}
              {labels.slice(0, 2).map((label) => (
                <span
                  key={label}
                  className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-muted"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          <h2 className="line-clamp-2 min-h-10 break-words text-sm font-semibold leading-5 text-foreground group-hover:text-brand sm:text-base sm:leading-6">
            {product.name}
          </h2>
          <p className="mt-1.5 line-clamp-2 break-words text-xs leading-5 text-muted sm:text-sm">
            {product.brand_name || "Unknown brand"}
            {product.category_name ? ` · ${product.category_name}` : ""}
          </p>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-5">
            <div>
              <p className="text-base font-semibold tabular-nums text-foreground sm:text-lg">
                {formatPrice(product.final_price || product.price)}
              </p>
              {product.compare_price && (
                <p className="text-xs tabular-nums text-muted line-through sm:text-sm">
                  {formatPrice(product.compare_price)}
                </p>
              )}
            </div>
            <p
              className={`text-xs font-medium ${product.available_stock > 0 ? "text-muted" : "text-danger"}`}
            >
              {product.available_stock > 0 ? (
                <>Stock: {product.available_stock}</>
              ) : (
                "Out of stock"
              )}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
