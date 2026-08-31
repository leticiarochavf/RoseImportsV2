"use client";

import { useState } from "react";
import { ProductImage } from "@/components/product-image";

export function ProductGallery({
  images,
  productName,
}: {
  images: { path: string; alt: string | null }[];
  productName: string;
}) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? null;
  const hasGallery = images.length > 1;

  function move(direction: -1 | 1) {
    setSelected((currentIndex) =>
      (currentIndex + direction + images.length) % images.length,
    );
  }

  return (
    <div
      className={`grid gap-3 ${
        hasGallery ? "sm:grid-cols-[5rem_minmax(0,1fr)]" : "grid-cols-1"
      }`}
    >
      {hasGallery && (
        <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col">
          {images.slice(0, 6).map((image, index) => (
            <button
              key={image.path}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Ver imagem ${index + 1} de ${productName}`}
              className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-md border bg-gradient-to-br from-surface to-ivory-deep sm:w-full ${
                selected === index ? "border-rose" : "border-line"
              }`}
            >
              <ProductImage
                path={image.path}
                alt={image.alt ?? productName}
                sizes="80px"
                className="object-contain object-center"
              />
            </button>
          ))}
        </div>
      )}

      <div className="group/gallery order-1 relative aspect-square w-full min-w-0 overflow-hidden rounded-xl border border-line bg-gradient-to-br from-surface to-ivory-deep shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)] sm:order-2">
        <ProductImage
          path={current?.path ?? null}
          alt={current?.alt ?? productName}
          sizes="(max-width: 1024px) 100vw, 52vw"
          priority
          className="object-contain object-center"
        />

        {hasGallery && (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={`Ver imagem anterior de ${productName}`}
              className="
                pointer-events-none absolute left-3 top-1/2 z-10
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
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => move(1)}
              aria-label={`Ver próxima imagem de ${productName}`}
              className="
                pointer-events-none absolute right-3 top-1/2 z-10
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
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
