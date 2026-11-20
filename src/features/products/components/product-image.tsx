"use client";

/* Seller-managed API images can be relative media paths or external URLs. */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ImageOff } from "lucide-react";

type Props = {
  src: string | null;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

export function ProductImage({
  src,
  alt,
  className = "",
  loading = "lazy",
}: Props) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) {
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt ? `${alt} — image unavailable` : undefined}
        aria-hidden={alt ? undefined : true}
        className={`flex h-full w-full flex-col items-center justify-center gap-2 text-muted ${className}`}
      >
        <ImageOff size={24} strokeWidth={1.5} aria-hidden="true" />
        <span className="text-xs">No image</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={800}
      height={800}
      loading={loading}
      decoding="async"
      onError={() => setFailedSource(src)}
      className={className}
    />
  );
}
