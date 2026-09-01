"use client";

import { EmptyState } from "@/components/empty-state";
import { ProductGrid } from "@/components/product-card";
import type { ProductCard } from "@/features/catalog/queries";
import { useFavorites } from "@/features/favorites/use-favorites";

/**
 * Cruza os ids guardados no navegador com o catálogo ativo. Favorito
 * cujo produto foi desativado ou removido some da lista sem alarde —
 * não há o que mostrar nem por que quebrar a página.
 */
export function FavoritesList({ products }: { products: ProductCard[] }) {
  const { ids, ready } = useFavorites();

  // Antes de hidratar não há como saber a lista; um estado vazio nesse
  // instante apareceria e sumiria, o que é pior que esperar um tique.
  if (!ready) {
    return <div className="mt-10 h-64" aria-hidden />;
  }

  const order = new Map(ids.map((id, index) => [id, index] as const));

  const favorites = products
    .filter((product) => order.has(product.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  if (favorites.length === 0) {
    return (
      <div className="mt-10">
        <EmptyState
          title="Nenhum favorito ainda"
          description="Toque no coração dos produtos que você quiser guardar. Eles ficam salvos aqui neste navegador."
          actionLabel="Ver catálogo"
          actionHref="/catalogo"
        />
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 flex items-center border-b border-line pb-4">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {favorites.length === 1
            ? "1 produto favoritado"
            : `${favorites.length} produtos favoritados`}
        </p>
      </div>

      <section className="mt-6">
        <ProductGrid products={favorites} priorityCount={4} />
      </section>
    </>
  );
}
