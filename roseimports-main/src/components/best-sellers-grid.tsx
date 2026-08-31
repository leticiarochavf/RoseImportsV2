"use client";

import { ProductGrid } from "@/components/product-card";
import { useHomePicks } from "@/features/home/home-picks";

/**
 * Vitrine de produtos da Home. Enquanto não há vendas registradas, as
 * vagas vêm do sorteio; com histórico, o ranking real ocupa as
 * primeiras posições e o sorteio completa o restante.
 */
export function BestSellersGrid({ priorityCount = 4 }: { priorityCount?: number }) {
  const { carousel, ready } = useHomePicks();

  if (carousel.length === 0) return null;

  return (
    <div className={`${ready ? "" : "opacity-0"}`}>
      <ProductGrid products={carousel} priorityCount={priorityCount} />
    </div>
  );
}
