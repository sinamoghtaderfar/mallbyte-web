"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ProductDetail } from "@/features/products/types";
import { getApiErrorMessage } from "@/lib/api/errors";

import { deleteSellerProduct, getSellerProduct } from "../api";
import { SellerProductImagesManager } from "./seller-product-images-manager";
import { SellerProductVariantsManager } from "./seller-product-variants-manager";

function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "0";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function getStatusClass(status: string) {
  if (status === "approved") {
    return "bg-green-100 text-green-700";
  }

  if (status === "rejected") {
    return "bg-red-100 text-red-700";
  }

  if (status === "draft") {
    return "bg-slate-100 text-slate-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

export function SellerProductDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = params.id;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setIsLoading(true);
      setError("");
      setDeleteError("");

      try {
        const data = await getSellerProduct(productId);

        if (isMounted) {
          setProduct(data);
        }
      } catch (productError) {
        if (isMounted) {
          setError(getApiErrorMessage(productError));
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

  async function handleDeleteProduct() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?",
    );

    if (!confirmed) {
      return;
    }

    setDeleteError("");
    setIsDeleting(true);

    try {
      await deleteSellerProduct(productId);
      router.push("/seller/products");
    } catch (deleteProductError) {
      setDeleteError(getApiErrorMessage(deleteProductError));
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading seller product...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load seller product
        </h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>

        <Link
          href="/seller/products"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
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
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Seller product
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {product.name}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {product.short_description || product.description}
            </p>
          </div>

          <span
            className={[
              "rounded-full px-4 py-2 text-sm font-medium capitalize",
              getStatusClass(product.status),
            ].join(" ")}
          >
            {product.status}
          </span>
        </div>

        {deleteError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Price
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {formatPrice(product.final_price)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Available
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {product.available_stock}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Reserved
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {product.reserved_stock}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Views
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {product.views_count}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              SKU
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {product.sku}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Category
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {product.category_name || "No category"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Brand
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {product.brand_name || "No brand"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Barcode
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {product.barcode || "Not set"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Description
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {product.description}
          </p>
        </div>

        <SellerProductImagesManager productId={product.id} />

        <SellerProductVariantsManager productId={product.id} />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/seller/products/${product.id}/edit`}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Edit product
          </Link>

          <button
            type="button"
            onClick={handleDeleteProduct}
            disabled={isDeleting}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 px-5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete product"}
          </button>

          <Link
            href="/seller/products"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to products
          </Link>
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Product status</h2>

        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>
            <span className="font-semibold text-slate-950">Pending:</span> waits
            for admin approval.
          </p>
          <p>
            <span className="font-semibold text-slate-950">Approved:</span>{" "}
            visible to customers.
          </p>
          <p>
            <span className="font-semibold text-slate-950">Rejected:</span>{" "}
            needs changes before approval.
          </p>
        </div>
      </aside>
    </div>
  );
}
