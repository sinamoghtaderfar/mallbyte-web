"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { createSellerProduct } from "../api";
import type { SellerProductPayload } from "../types";
import { PageHeader } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/states";

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

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapFormToPayload(form: FormState): SellerProductPayload {
  return {
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
    labels: [],
  };
}

export function SellerProductCreateForm() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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

    setError("");
    setIsSubmitting(true);

    try {
      await createSellerProduct(mapFormToPayload(form));
      router.push("/seller/products");
    } catch (createError) {
      setError(getApiErrorMessage(createError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6" noValidate={false}>
      <PageHeader eyebrow="New seller product" title="Create product"
        description="Add a new product. It will be submitted for admin approval."
        crumbs={[{ href: "/seller/products", label: "Products" }, { label: "New product" }]} />
      {error ? <Notice tone="danger" title="The product was not created">{error}</Notice> : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-6">
          <ProductFormSections form={form} onChange={handleChange} disabled={isSubmitting} />
        </div>
        <ProductFormAside form={form} title="Ready to submit?" busy={isSubmitting}
          canSubmit={!isSubmitting && Boolean(form.category)} submitLabel="Create product" busyLabel="Creating..."
          cancelHref="/seller/products" cancelLabel="Back to products"
          notes={[
            "New products are submitted with pending status.",
            "Admin approval is needed before customers can buy them.",
            "Add images and variants from the product page after creating it.",
          ]} />
      </div>
    </form>
  );
}
