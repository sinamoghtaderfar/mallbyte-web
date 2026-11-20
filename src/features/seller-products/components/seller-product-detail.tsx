"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ProductDetail } from "@/features/products/types";
import { ArrowLeft, Boxes, Eye, Lock, PackageX, Pencil, Tag, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { DetailList } from "@/components/ui/data-display";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
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
      <div className="grid gap-6" aria-busy="true">
        <p role="status" className="sr-only">Loading seller product...</p>
        <Skeleton className="h-24 max-w-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid max-w-2xl gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Could not load seller product</h1>
        <Notice tone="danger">{error}</Notice>
        <div><Link href="/seller/products" className={buttonStyles()}>Back to products</Link></div>
      </div>
    );
  }

  if (!product) {
    return (
      <EmptyState icon={<PackageX size={24} />} title="Product not found"
        description="It may have been deleted or belong to another store."
        action={<Link href="/seller/products" className={buttonStyles({ variant: "secondary" })}>Back to products</Link>} />
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Seller product" title={product.name}
        description={product.short_description || product.description}
        crumbs={[{ href: "/seller/products", label: "Products" }, { label: "Product details" }]}
        actions={<>
          <Link href={`/seller/products/${product.id}/edit`} className={buttonStyles()}><Pencil size={15} aria-hidden="true" />Edit product</Link>
          <Button variant="secondary" onClick={handleDeleteProduct} loading={isDeleting}
            className="text-rose-700 hover:border-rose-300 hover:bg-rose-50">
            {!isDeleting && <Trash2 size={15} aria-hidden="true" />}{isDeleting ? "Deleting..." : "Delete product"}
          </Button>
        </>} />

      {deleteError ? <Notice tone="danger">{deleteError}</Notice> : null}

      <section aria-label="Product metrics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Price" value={formatPrice(product.final_price)} icon={<Tag size={16} />} tone="ink" />
        <StatCard label="Available" value={product.available_stock} icon={<Boxes size={16} />}
          hint={product.available_stock <= 0 ? "Out of stock" : undefined} />
        <StatCard label="Reserved" value={product.reserved_stock} icon={<Lock size={16} />} hint="Held by open orders" />
        <StatCard label="Views" value={product.views_count} icon={<Eye size={16} />} />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <CardHeader title="Description" />
            <p className="mt-3 max-w-[70ch] text-sm leading-7 whitespace-pre-line text-slate-700">{product.description}</p>
          </Card>
          <SellerProductImagesManager productId={product.id} />
          <SellerProductVariantsManager productId={product.id} />
        </div>

        <aside className="grid gap-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader title="Status" action={<StatusBadge status={product.status} label={product.status} className="capitalize" />} />
            <ul className="mt-4 grid gap-2.5 text-sm leading-6 text-muted">
              <li><span className="font-medium text-foreground">Pending:</span> waits for admin approval.</li>
              <li><span className="font-medium text-foreground">Approved:</span> visible to customers.</li>
              <li><span className="font-medium text-foreground">Rejected:</span> needs changes before approval.</li>
            </ul>
          </Card>
          <Card>
            <CardHeader title="Details" />
            <DetailList className="mt-4" columns={1} items={[
              { label: "SKU", value: product.sku, mono: true },
              { label: "Category", value: product.category_name || "No category" },
              { label: "Brand", value: product.brand_name || "No brand" },
              { label: "Barcode", value: product.barcode || "Not set", mono: Boolean(product.barcode) },
            ]} />
          </Card>
          <Link href="/seller/products" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 underline-offset-4 hover:text-foreground hover:underline">
            <ArrowLeft size={15} aria-hidden="true" />Back to products
          </Link>
        </aside>
      </div>
    </div>
  );
}
