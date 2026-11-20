"use client";

import { buttonStyles } from "@/components/ui/button";
import { ProductGallery } from "./product-gallery";

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
      <div role="status" className="grid items-start gap-8 lg:grid-cols-2">
        <span className="sr-only">Loading product...</span>
        <div
          aria-hidden="true"
          className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100"
        />
        <div aria-hidden="true" className="space-y-5 py-2">
          <div className="h-4 w-1/3 rounded bg-slate-100" />
          <div className="h-9 w-4/5 rounded bg-slate-100" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="h-24 rounded bg-slate-100" />
          <div className="h-12 w-1/2 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-6 sm:p-8"
      >
        <h1 className="text-xl font-semibold text-danger">
          Could not load product
        </h1>
        <p className="mt-2 break-words text-sm leading-6 text-danger">
          {error}
        </p>
        <Link
          href="/products"
          className={buttonStyles({ variant: "secondary", className: "mt-6" })}
        >
          Back to products
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-foreground">
          Product not found
        </h1>
        <Link href="/products" className={buttonStyles({ className: "mt-6" })}>
          Back to products
        </Link>
      </div>
    );
  }

  const labels = product.label_display.length
    ? product.label_display
    : product.labels;

  return (
    <div className="space-y-7">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2 text-sm text-muted"
      >
        <Link href="/products" className="shrink-0 hover:text-brand">
          Products
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate" aria-current="page">
          {product.name}
        </span>
      </nav>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
        <ProductGallery
          key={product.id}
          productName={product.name}
          images={product.images}
        />
        <section className="min-w-0 py-1">
          {(product.is_featured || labels.length > 0) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {product.is_featured && (
                <span className="rounded bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
                  Featured
                </span>
              )}
              {labels.slice(0, 3).map((label) => (
                <span
                  key={label}
                  className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm text-muted">
            {product.brand_name || "Unknown brand"}
            {product.category_name ? ` · ${product.category_name}` : ""}
          </p>
          <h1 className="mt-3 break-words text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            {product.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <p className="font-semibold tabular-nums text-foreground">
              {product.average_rating ?? "—"} / 5
            </p>
            <span aria-hidden="true">·</span>
            <p>{product.reviews_count} reviews</p>
          </div>
          {product.short_description && (
            <p className="mt-5 break-words text-base leading-7 text-muted">
              {product.short_description}
            </p>
          )}
          <div className="mt-6 border-y border-line py-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                {formatPrice(product.final_price || product.price)}
              </p>
              {product.compare_price && (
                <p className="text-base tabular-nums text-muted line-through">
                  {formatPrice(product.compare_price)}
                </p>
              )}
            </div>
            <p
              className={`mt-3 text-sm font-medium ${product.is_in_stock ? "text-brand" : "text-danger"}`}
            >
              {product.is_in_stock
                ? `${product.available_stock} available`
                : "Out of stock"}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <AddToCartButton
              productId={product.id}
              disabled={!product.is_in_stock}
            />
            <WishlistButton productId={product.id} />
          </div>
          <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 text-sm">
            <div className="min-w-0">
              <dt className="text-muted">Seller</dt>
              <dd className="mt-1 break-words font-medium text-foreground">
                {product.seller_name || product.seller_email || "—"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted">SKU</dt>
              <dd className="mt-1 break-words font-medium text-foreground">
                {product.sku || "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/recently-viewed"
              className={buttonStyles({ variant: "quiet", size: "small" })}
            >
              Recently viewed
            </Link>
            <Link
              href="/products"
              className={buttonStyles({ variant: "quiet", size: "small" })}
            >
              Back to products
            </Link>
            <p className="text-xs tabular-nums text-muted">
              {product.views_count} views
            </p>
          </div>
        </section>
        <section className="border-t border-line pt-7 lg:col-span-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Description
          </h2>
          <p className="mt-4 max-w-4xl whitespace-pre-line break-words text-base leading-8 text-muted">
            {product.description || "No description available."}
          </p>
        </section>
        {product.attributes.length > 0 && (
          <section className="border-t border-line pt-7 lg:col-span-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Attributes
            </h2>
            <dl className="mt-5 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {product.attributes.map((attribute) => (
                <div
                  key={`${attribute.attribute_slug}-${attribute.value_slug}`}
                  className="min-w-0 border-b border-line py-4"
                >
                  <dt className="text-sm text-muted">{attribute.attribute}</dt>
                  <dd className="mt-1 break-words text-sm font-medium text-foreground">
                    {attribute.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {product.variants.length > 0 && (
          <section className="border-t border-line pt-7 lg:col-span-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Variants
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {product.variants.map((variant) => (
                <div
                  key={variant.id}
                  className="min-w-0 rounded-lg border border-line bg-surface p-4"
                >
                  <h3 className="break-words text-sm font-semibold text-foreground">
                    {variant.name}
                  </h3>
                  <p className="mt-1 break-words text-xs text-muted">
                    SKU: {variant.sku}
                  </p>
                  <p className="mt-4 text-base font-semibold tabular-nums text-foreground">
                    {formatPrice(variant.final_price || variant.price)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Stock: {variant.stock}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
        <ProductReviewsSection productId={product.id} />
        <RelatedProductsSection productId={product.id} />
      </div>
    </div>
  );
}
