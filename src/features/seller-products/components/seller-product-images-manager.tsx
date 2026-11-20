"use client";

import { getImageUrl } from "@/lib/media/image-url";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import type { ProductImage } from "@/features/products/types";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { controlStyles } from "@/components/ui/input";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  createSellerProductImage,
  deleteSellerProductImage,
  getSellerProductImages,
} from "../api";

type SellerProductImagesManagerProps = {
  productId: number | string;
};

export function SellerProductImagesManager({
  productId,
}: SellerProductImagesManagerProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [isMain, setIsMain] = useState(false);
  const [order, setOrder] = useState("0");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadImages() {
    setError("");

    const data = await getSellerProductImages(String(productId));
    setImages(data);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialImages() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getSellerProductImages(String(productId));

        if (isMounted) {
          setImages(data);
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

    void loadInitialImages();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select an image file.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await createSellerProductImage(String(productId), {
        file: selectedFile,
        alt_text: altText.trim(),
        is_main: isMain,
        order: Number(order || 0),
      });

      setSelectedFile(null);
      setAltText("");
      setIsMain(false);
      setOrder("0");

      await loadImages();
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteImage(imageId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this image?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingImageId(imageId);

    try {
      await deleteSellerProductImage(imageId);
      await loadImages();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setDeletingImageId(null);
    }
  }

  return (
    <Card>
      <CardHeader eyebrow="Product images" title="Manage images"
        description="Upload product images and choose which image should be marked as main." />

      {error ? <Notice tone="danger" className="mt-5">{error}</Notice> : null}

      <form onSubmit={handleUpload} className="mt-5 grid gap-4 rounded-xl border border-dashed border-line-strong bg-sunken/40 p-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <label htmlFor={`image-file-${productId}`} className="text-sm font-medium text-foreground">Image file</label>
          <input id={`image-file-${productId}`} type="file" accept="image/*" onChange={handleFileChange}
            className="block w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-medium file:text-white" />
          {selectedFile && <p className="text-xs text-foreground">Selected: <span className="font-medium">{selectedFile.name}</span></p>}
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={`image-alt-${productId}`} className="text-sm font-medium text-foreground">Alt text</label>
          <input id={`image-alt-${productId}`} value={altText} onChange={(event) => setAltText(event.target.value)}
            placeholder="Keyboard front view" aria-describedby={`image-alt-hint-${productId}`} className={controlStyles} />
          <p id={`image-alt-hint-${productId}`} className="text-xs text-muted">Describe what the photo shows for screen reader users.</p>
        </div>
        <div className="grid content-start gap-1.5">
          <label htmlFor={`image-order-${productId}`} className="text-sm font-medium text-foreground">Order</label>
          <input id={`image-order-${productId}`} type="number" inputMode="numeric" min="0" value={order}
            onChange={(event) => setOrder(event.target.value)} className={controlStyles} />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-foreground sm:col-span-2">
          <input type="checkbox" checked={isMain} onChange={(event) => setIsMain(event.target.checked)} className="size-4" />
          Set as main image
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>{!isSubmitting && <Upload size={15} aria-hidden="true" />}{isSubmitting ? "Uploading..." : "Upload image"}</Button>
        </div>
      </form>

      <div className="mt-6" aria-live="polite">
        {isLoading ? (
          <div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <span className="sr-only">Loading product images...</span>
            {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}
          </div>
        ) : null}

        {!isLoading && !images.length ? (
          <EmptyState className="py-10" icon={<ImagePlus size={22} />} title="No images yet" description="Upload the first product image." />
        ) : null}

        {images.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image) => {
              const imageUrl = getImageUrl(image.image);
              return (
                <li key={image.id} className={`overflow-hidden rounded-xl border bg-surface ${image.is_main ? "border-ink ring-1 ring-ink" : "border-line"}`}>
                  <div className="relative flex aspect-[4/3] items-center justify-center bg-sunken bg-cover bg-center"
                    style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
                    role={imageUrl ? "img" : undefined} aria-label={imageUrl ? image.alt_text || "Product image" : undefined}>
                    {!imageUrl ? <span className="text-sm text-muted">No image</span> : null}
                    {image.is_main ? <span className="absolute top-2.5 left-2.5"><Badge tone="ink"><Star size={11} aria-hidden="true" />Main</Badge></span> : null}
                  </div>
                  <div className="flex items-start justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{image.alt_text || "Product image"}</p>
                      <p className="mt-0.5 text-xs text-muted" data-numeric>Order: {image.order}</p>
                    </div>
                    <Button size="small" variant="quiet" onClick={() => void handleDeleteImage(image.id)} loading={deletingImageId === image.id}
                      className="shrink-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800">
                      {deletingImageId !== image.id && <Trash2 size={15} aria-hidden="true" />}{deletingImageId === image.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}
