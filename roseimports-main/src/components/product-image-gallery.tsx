"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductImage } from "@/components/product-image";

type GalleryImage = {
  path: string;
  alt: string | null;
};

type ProductImageGalleryProps = {
  images: GalleryImage[];
  fallbackPath?: string | null;
  fallbackAlt?: string | null;
  productName: string;
  productHref: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="m15 18-6-6 6-6" />
      ) : (
        <path d="m9 18 6-6-6-6" />
      )}
    </svg>
  );
}

export function ProductImageGallery({
  images,
  fallbackPath = null,
  fallbackAlt = null,
  productName,
  productHref,
  sizes,
  priority = false,
  className = "relative",
  imageClassName = "object-contain object-center",
}: ProductImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0] ?? null;
  const hasGallery = images.length > 1;

  function move(direction: -1 | 1) {
    setSelected((currentIndex) =>
      (currentIndex + direction + images.length) % images.length,
    );
  }

  return (
    <div className={`group/gallery overflow-hidden ${className}`}>
      <ProductImage
        path={current?.path ?? fallbackPath}
        alt={current?.alt ?? fallbackAlt ?? productName}
        sizes={sizes}
        priority={priority}
        className={imageClassName}
      />

      <Link
        href={productHref}
        aria-label={`Ver ${productName}`}
        className="absolute inset-0 z-10"
      />

      {hasGallery && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={`Ver imagem anterior de ${productName}`}
            className="
              pointer-events-none absolute left-3 top-1/2 z-20
              flex h-11 w-11 -translate-y-1/2 items-center justify-center
              rounded-full border border-line bg-surface/95 text-ink
              opacity-0 shadow-[0_4px_14px_rgba(0,0,0,0.12)]
              transition-all duration-200
              hover:border-rose hover:bg-rose hover:text-white
              focus-visible:pointer-events-auto focus-visible:opacity-100
              group-hover/gallery:pointer-events-auto group-hover/gallery:opacity-100
              max-sm:pointer-events-auto max-sm:opacity-100
            "
          >
            <ArrowIcon direction="left" />
          </button>

          <button
            type="button"
            onClick={() => move(1)}
            aria-label={`Ver próxima imagem de ${productName}`}
            className="
              pointer-events-none absolute right-3 top-1/2 z-20
              flex h-11 w-11 -translate-y-1/2 items-center justify-center
              rounded-full border border-line bg-surface/95 text-ink
              opacity-0 shadow-[0_4px_14px_rgba(0,0,0,0.12)]
              transition-all duration-200
              hover:border-rose hover:bg-rose hover:text-white
              focus-visible:pointer-events-auto focus-visible:opacity-100
              group-hover/gallery:pointer-events-auto group-hover/gallery:opacity-100
              max-sm:pointer-events-auto max-sm:opacity-100
            "
          >
            <ArrowIcon direction="right" />
          </button>
        </>
      )}
    </div>
  );
}
