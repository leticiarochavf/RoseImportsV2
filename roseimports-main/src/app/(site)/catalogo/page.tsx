import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductGrid } from "@/components/product-card";
import { EmptyState } from "@/components/empty-state";
import { CatalogFilters } from "@/features/catalog/catalog-filters";
import {
  getCatalogProducts,
  getCategories,
  getOlfactoryFamilies,
} from "@/features/catalog/queries";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Perfumes, cosméticos, eletrônicos e acessórios importados disponíveis na Rose Imports.",
};

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function first(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const filters = {
    q: first(params.q),
    categoria: first(params.categoria),
    genero: first(params.genero),
    familia: first(params.familia),
  };

  const [products, categories, families] = await Promise.all([
    getCatalogProducts(filters),
    getCategories(),
    getOlfactoryFamilies(),
  ]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      {/* Cabeçalho */}
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Catálogo
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
          Encontre perfumes, cosméticos, eletrônicos e acessórios selecionados
          pela Rose Imports.
        </p>
      </header>

      {/* Filtros */}
      <section className="mt-8">
        <Suspense fallback={<div className="h-24" />}>
          <CatalogFilters
            categories={categories}
            families={families}
          />
        </Suspense>
      </section>

      {/* Quantidade de produtos */}
      <div className="mt-5 flex items-center border-b border-border/60 pb-4">
        <p
          className="text-sm text-muted"
          role="status"
          aria-live="polite"
        >
          {products.length === 1
            ? "1 produto encontrado"
            : `${products.length} produtos encontrados`}
        </p>
      </div>

      {/* Produtos */}
      <section className="mt-6">
        {products.length > 0 ? (
          <ProductGrid
            products={products}
            priorityCount={4}
          />
        ) : hasFilters ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Tente outro termo de busca ou ajuste os filtros para encontrar mais opções."
            actionLabel="Limpar filtros"
            actionHref="/catalogo"
          />
        ) : (
          <EmptyState
            title="Novidades chegando"
            description="Estamos preparando novos produtos para o catálogo. Fale com a gente pelo WhatsApp para conferir o que já está disponível."
            actionLabel="Voltar ao início"
            actionHref="/"
          />
        )}
      </section>
    </main>
  );
}