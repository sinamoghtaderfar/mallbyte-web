import Link from "next/link";

import type { ProductListItem } from "../types";

type ProductCardProps = {
  product: ProductListItem;
};

function formatPrice(value: string) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function getImageUrl(path: string | null) {
  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = getImageUrl(product.main_image);
  const labels = product.label_display.length
    ? product.label_display
    : product.labels;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <Link href={`/products/${product.id}`} className="block">
        <div
          className="flex aspect-[4/3] items-center justify-center bg-slate-100 bg-cover bg-center"
          style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
        >
          {!imageUrl ? (
            <span className="text-sm font-medium text-slate-400">
              No image
            </span>
          ) : null}
        </div>

        <div className="p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {product.is_featured ? (
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                Featured
              </span>
            ) : null}

            {labels.slice(0, 2).map((label) => (
              <span
                key={label}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {label}
              </span>
            ))}
          </div>

          <h2 className="line-clamp-2 text-base font-semibold text-slate-950">
            {product.name}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {product.brand_name || "Unknown brand"}
            {product.category_name ? ` · ${product.category_name}` : ""}
          </p>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-950">
                {formatPrice(product.final_price || product.price)}
              </p>

              {product.compare_price ? (
                <p className="text-sm text-slate-400 line-through">
                  {formatPrice(product.compare_price)}
                </p>
              ) : null}
            </div>

            <p className="text-xs font-medium text-slate-500">
              Stock: {product.available_stock}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
