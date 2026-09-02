"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import type { ProductImage } from "@/features/products/types";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  createSellerProductImage,
  deleteSellerProductImage,
  getSellerProductImages,
} from "../api";

type SellerProductImagesManagerProps = {
  productId: number | string;
};

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
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Product images
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Manage images
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Upload product images and choose which image should be marked as main.
        </p>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleUpload} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Image file</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Alt text</span>
          <input
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="Keyboard front view"
            className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Order</span>
          <input
            type="number"
            min="0"
            value={order}
            onChange={(event) => setOrder(event.target.value)}
            className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          />
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={isMain}
            onChange={(event) => setIsMain(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Set as main image
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Uploading..." : "Upload image"}
          </button>
        </div>
      </form>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading product images...</p>
        ) : null}

        {!isLoading && !images.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-6">
            <h3 className="text-lg font-semibold text-slate-950">
              No images yet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Upload the first product image.
            </p>
          </div>
        ) : null}

        {images.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => {
              const imageUrl = getImageUrl(image.image);

              return (
                <div
                  key={image.id}
                  className="overflow-hidden rounded-3xl border border-slate-200"
                >
                  <div
                    className="flex aspect-[4/3] items-center justify-center bg-slate-100 bg-cover bg-center"
                    style={
                      imageUrl
                        ? { backgroundImage: `url(${imageUrl})` }
                        : undefined
                    }
                  >
                    {!imageUrl ? (
                      <span className="text-sm text-slate-400">No image</span>
                    ) : null}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {image.alt_text || "Product image"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Order: {image.order}
                        </p>
                      </div>

                      {image.is_main ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          Main
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDeleteImage(image.id)}
                      disabled={deletingImageId === image.id}
                      className="mt-4 h-10 rounded-2xl border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingImageId === image.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
