import type { Metadata } from "next";
import { FavoritesList } from "@/features/favorites/favorites-list";
import { getProductPool } from "@/features/catalog/queries";

export const metadata: Metadata = {
  title: "Favoritos",
  description: "Os produtos que você separou na Rose Imports.",
};

export const revalidate = 60;

export default async function FavoritosPage() {
  /*
     Os favoritos vivem no navegador, então o servidor não sabe quais
     são. Mandamos o catálogo ativo e o cliente cruza com a própria
     lista — o que já resolve o produto que saiu do ar: se ele não está
     aqui, simplesmente não aparece.
  */
  const products = await getProductPool();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Favoritos
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
          Os produtos que você separou ficam salvos neste navegador.
        </p>
      </header>

      <FavoritesList products={products} />
    </main>
  );
}
