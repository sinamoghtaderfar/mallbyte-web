"use client";

import { useState } from "react";
import { getImageUrl } from "@/lib/media/image-url";
import type { ProductImage as ProductImageData } from "../types";
import { ProductImage } from "./product-image";

type Props = { productName: string; images: ProductImageData[] };

/** The parent keys the gallery by product ID, so selection belongs to one product. */
export function ProductGallery({ productName, images }: Props) {
  const [selectedId, setSelectedId] = useState(
    () => (images.find((image) => image.is_main) ?? images[0])?.id,
  );
  const selected =
    images.find((image) => image.id === selectedId) ??
    images.find((image) => image.is_main) ??
    images[0];
  const selectedIndex = selected ? images.indexOf(selected) : 0;
  return (
    <section
      aria-label={`${productName} images`}
      className="min-w-0 self-start"
    >
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-line bg-[#f0efeb]">
        <ProductImage
          src={getImageUrl(selected?.image)}
          alt={selected?.alt_text || productName}
          loading="eager"
          className="h-full w-full object-contain p-4 sm:p-6"
        />
      </div>
      {images.length > 1 && (
        <>
          <div
            className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5"
            aria-label="Choose a product image"
          >
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={`View image ${index + 1} of ${productName}`}
                aria-pressed={image.id === selected?.id}
                onClick={() => setSelectedId(image.id)}
                className={`aspect-square min-h-11 overflow-hidden rounded-lg border-2 p-1 transition-colors ${image.id === selected?.id ? "border-brand bg-brand-soft" : "border-transparent bg-slate-100 hover:border-slate-400"}`}
              >
                <ProductImage
                  src={getImageUrl(image.image)}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </button>
            ))}
          </div>
          <p
            aria-live="polite"
            className="mt-3 text-center text-xs tabular-nums text-muted"
          >
            Image {selectedIndex + 1} of {images.length}
          </p>
        </>
      )}
    </section>
  );
}
