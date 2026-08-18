"use client";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getProduct } from "../api";
import type { ProductDetail as ProductDetailType } from "../types";

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

function getImageUrl(path: string | null | undefined) {
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

export function ProductDetail() {
  const params = useParams<{ id: string }>();

  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getProduct(params.id);

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

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading product...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load product
        </h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>

        <Link
          href="/products"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-red-700 px-5 text-sm font-medium text-white transition hover:bg-red-800"
        >
          Back to products
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">
          Product not found
        </h1>

        <Link
          href="/products"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Back to products
        </Link>
      </div>
    );
  }

  const mainImage =
    product.images.find((image) => image.is_main) ?? product.images[0];
  const imageUrl = getImageUrl(mainImage?.image);
  const labels = product.label_display.length
    ? product.label_display
    : product.labels;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div
          className="flex aspect-[4/3] items-center justify-center bg-slate-100 bg-cover bg-center"
          style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
        >
          {!imageUrl ? (
            <span className="text-sm font-medium text-slate-400">No image</span>
          ) : null}
        </div>

        {product.images.length > 1 ? (
          <div className="grid grid-cols-4 gap-3 p-4">
            {product.images.slice(0, 4).map((image) => {
              const thumbnailUrl = getImageUrl(image.image);

              return (
                <div
                  key={image.id}
                  className="aspect-square rounded-2xl bg-slate-100 bg-cover bg-center"
                  style={
                    thumbnailUrl
                      ? { backgroundImage: `url(${thumbnailUrl})` }
                      : undefined
                  }
                />
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {product.is_featured ? (
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
              Featured
            </span>
          ) : null}

          {labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {label}
            </span>
          ))}
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          {product.name}
        </h1>

        <p className="mt-3 text-sm text-slate-500">
          {product.brand_name || "Unknown brand"}
          {product.category_name ? ` · ${product.category_name}` : ""}
        </p>

        {product.short_description ? (
          <p className="mt-5 text-base leading-7 text-slate-600">
            {product.short_description}
          </p>
        ) : null}

        <div className="mt-8 rounded-3xl bg-slate-50 p-5">
          <p className="text-3xl font-semibold text-slate-950">
            {formatPrice(product.final_price || product.price)}
          </p>

          {product.compare_price ? (
            <p className="mt-1 text-sm text-slate-400 line-through">
              {formatPrice(product.compare_price)}
            </p>
          ) : null}

          <p className="mt-4 text-sm font-medium text-slate-600">
            {product.is_in_stock
              ? `${product.available_stock} available`
              : "Out of stock"}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              SKU
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {product.sku || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Seller
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {product.seller_name || product.seller_email || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Rating
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {product.average_rating ?? "—"} / 5
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Reviews
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {product.reviews_count}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <AddToCartButton
            productId={product.id}
            disabled={!product.is_in_stock}
          />

          <Link
            href="/products"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to products
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:col-span-2">
        <h2 className="text-xl font-semibold text-slate-950">Description</h2>

        <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-600">
          {product.description || "No description available."}
        </p>
      </section>

      {product.attributes.length ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-950">Attributes</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {product.attributes.map((attribute) => (
              <div
                key={`${attribute.attribute_slug}-${attribute.value_slug}`}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  {attribute.attribute}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {attribute.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {product.variants.length ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-950">Variants</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {product.variants.map((variant) => (
              <div
                key={variant.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <p className="text-sm font-semibold text-slate-950">
                  {variant.name}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  SKU: {variant.sku}
                </p>
                <p className="mt-3 text-base font-semibold text-slate-950">
                  {formatPrice(variant.final_price || variant.price)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Stock: {variant.stock}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
