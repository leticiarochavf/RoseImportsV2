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

  return (
    <div className="grid gap-3 sm:grid-cols-[5rem_1fr]">
      {images.length > 1 && (
        <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col">
          {images.slice(0, 6).map((image, index) => (
            <button
              key={image.path}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Ver imagem ${index + 1} de ${productName}`}
              className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-md border bg-surface sm:w-full ${
                selected === index ? "border-rose" : "border-line"
              }`}
            >
              <ProductImage
                path={image.path}
                alt={image.alt ?? productName}
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      <div className="order-1 relative aspect-square overflow-hidden rounded-lg border border-line bg-surface sm:order-2">
        <ProductImage
          path={current?.path ?? null}
          alt={current?.alt ?? productName}
          sizes="(max-width: 1024px) 100vw, 52vw"
          priority
        />
      </div>
    </div>
  );
}
