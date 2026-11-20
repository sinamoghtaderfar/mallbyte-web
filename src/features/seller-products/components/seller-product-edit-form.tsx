"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

import type { ProductDetail } from "@/features/products/types";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  getSellerProduct,
  updateSellerProduct,
} from "../api";
import type { SellerProductPayload } from "../types";
import { buttonStyles } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Notice, Skeleton } from "@/components/ui/states";

import { ProductFormAside, ProductFormSections } from "./product-form-layout";

type FormState = {
  name: string;
  description: string;
  short_description: string;
  price: string;
  compare_price: string;
  cost_per_item: string;
  category: string;
  brand: string;
  sku: string;
  low_stock_threshold: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  barcode: string;
};

const initialForm: FormState = {
  name: "",
  description: "",
  short_description: "",
  price: "",
  compare_price: "",
  cost_per_item: "",
  category: "",
  brand: "",
  sku: "",
  low_stock_threshold: "5",
  weight: "",
  length: "",
  width: "",
  height: "",
  barcode: "",
};

function nullableToString(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapProductToForm(product: ProductDetail): FormState {
  return {
    name: product.name,
    description: product.description,
    short_description: product.short_description ?? "",
    price: product.price,
    compare_price: nullableToString(product.compare_price),
    cost_per_item: nullableToString(product.cost_per_item),
    category: product.category ? String(product.category) : "",
    brand: product.brand ? String(product.brand) : "",
    sku: product.sku,
    low_stock_threshold: String(product.low_stock_threshold),
    weight: nullableToString(product.weight),
    length: nullableToString(product.length),
    width: nullableToString(product.width),
    height: nullableToString(product.height),
    barcode: nullableToString(product.barcode),
  };
}

function mapFormToPayload(form: FormState, original: FormState): Partial<SellerProductPayload> {
  const values: Omit<SellerProductPayload, "labels"> = {
    name: form.name.trim(),
    description: form.description.trim(),
    short_description: form.short_description.trim(),
    price: form.price.trim(),
    compare_price: emptyToNull(form.compare_price),
    cost_per_item: emptyToNull(form.cost_per_item),
    category: Number(form.category),
    brand: form.brand ? Number(form.brand) : null,
    sku: form.sku.trim(),
    low_stock_threshold: Number(form.low_stock_threshold || 5),
    weight: emptyToNull(form.weight),
    length: emptyToNull(form.length),
    width: emptyToNull(form.width),
    height: emptyToNull(form.height),
    barcode: emptyToNull(form.barcode),
  };
  // PATCH only changed fields; untouched metadata belongs to the server.
  return Object.fromEntries(
    (Object.keys(values) as (keyof FormState)[])
      .filter((key) => form[key] !== original[key])
      .map((key) => [key, values[key]]),
  );
}

export function SellerProductEditForm() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const originalForm = useRef<FormState | null>(null);
  const [referenceLabels, setReferenceLabels] = useState<{
    category: string | null;
    brand: string | null;
  }>({ category: null, brand: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEditData() {
      setIsLoading(true);
      setError("");

      try {
        const product = await getSellerProduct(productId);

        if (!isMounted) {
          return;
        }

        const loadedForm = mapProductToForm(product);
        originalForm.current = loadedForm;
        setForm(loadedForm);
        setReferenceLabels({
          category: product.category_name,
          brand: product.brand_name,
        });
      } catch (editError) {
        if (isMounted) {
          setError(getApiErrorMessage(editError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadEditData();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!originalForm.current || isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const changes = mapFormToPayload(form, originalForm.current);
      if (Object.keys(changes).length) await updateSellerProduct(productId, changes);
      router.push(`/seller/products/${productId}`);
    } catch (updateError) {
      setError(getApiErrorMessage(updateError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-6" aria-busy="true">
        <p role="status" className="sr-only">Loading product edit form...</p>
        <Skeleton className="h-20 max-w-lg" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-6"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !form.name) {
    return (
      <div className="grid max-w-2xl gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Could not load product edit form
        </h1>
        <Notice tone="danger">{error}</Notice>
        <div>
          <Link href="/seller/products" className={buttonStyles()}>Back to products</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <PageHeader eyebrow="Edit seller product" title="Update product"
        description="Update product information. Only changed fields are sent; admin approval may still be required."
        crumbs={[{ href: "/seller/products", label: "Products" }, { href: `/seller/products/${productId}`, label: "Product" }, { label: "Edit" }]} />
      {error ? <Notice tone="danger" title="Changes were not saved">{error}</Notice> : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-6">
          <ProductFormSections form={form} onChange={handleChange} disabled={isSubmitting}
            categoryLabel={referenceLabels.category} brandLabel={referenceLabels.brand} />
        </div>
        <ProductFormAside form={form} title="Save changes" busy={isSubmitting}
          canSubmit={!isSubmitting && Boolean(form.category)} submitLabel="Save product" busyLabel="Saving..."
          cancelHref={`/seller/products/${productId}`} cancelLabel="Cancel"
          notes={[
            "Changing core product details can require approval again.",
            "Images and variants are managed from the product page.",
          ]} />
      </div>
    </form>
  );
}
