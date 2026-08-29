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

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
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
    <div className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
      <header>
        <p className="eyebrow">Nossos produtos</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Catálogo</h1>
        <div className="filete-left mt-3" aria-hidden />
      </header>

      <div className="mt-9">
        <Suspense fallback={<div className="h-32" />}>
          <CatalogFilters categories={categories} families={families} />
        </Suspense>
      </div>

      <p className="mt-8 text-xs text-muted" role="status">
        {products.length === 1
          ? "1 produto encontrado"
          : `${products.length} produtos encontrados`}
      </p>

      <div className="mt-6">
        {products.length > 0 ? (
          <ProductGrid products={products} priorityCount={4} />
        ) : hasFilters ? (
          <EmptyState
            title="Nenhum produto com esses filtros"
            description="Tente outro termo de busca ou remova alguns filtros para ver mais opções."
            actionLabel="Ver todo o catálogo"
            actionHref="/catalogo"
          />
        ) : (
          <EmptyState
            title="Catálogo em preparação"
            description="Os produtos estão sendo cadastrados. Fale com a gente no WhatsApp para saber o que já está disponível."
            actionLabel="Voltar ao início"
            actionHref="/"
          />
        )}
      </div>
    </div>
  );
}
