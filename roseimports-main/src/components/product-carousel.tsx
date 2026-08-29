"use client";

import { useRef } from "react";
import { ProductCard } from "@/components/product-card";
import type { ProductCard as ProductCardData } from "@/features/catalog/queries";

export function ProductCarousel({
  products,
  priorityCount = 0,
}: {
  products: ProductCardData[];
  priorityCount?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function move(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * Math.max(280, track.clientWidth * 0.82),
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:gap-5"
      >
        {products.map((product, index) => (
          <div
            key={product.id}
            className="w-[72vw] max-w-[17rem] shrink-0 snap-start sm:w-[42vw] lg:w-[22.5%]"
          >
            <ProductCard product={product} priority={index < priorityCount} />
          </div>
        ))}
      </div>

      {products.length > 2 && (
        <div className="mt-5 flex justify-end gap-2" aria-label="Controles do carrossel">
          <button
            type="button"
            onClick={() => move(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface transition-colors hover:border-rose hover:text-rose"
            aria-label="Ver produtos anteriores"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface transition-colors hover:border-rose hover:text-rose"
            aria-label="Ver próximos produtos"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
