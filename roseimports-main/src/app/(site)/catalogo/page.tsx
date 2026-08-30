import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProductGrid } from "@/components/product-card";
import { EmptyState } from "@/components/empty-state";
import { CatalogFilters } from "@/features/catalog/catalog-filters";
import {
  CATALOG_PAGE_SIZE,
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
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pageNumber(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(first(value) ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function pageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const selected = first(value);
    if (selected) next.set(key, selected);
  }

  next.delete("pagina");
  if (page > 1) next.set("pagina", String(page));

  const query = next.toString();
  return query ? `/catalogo?${query}` : "/catalogo";
}

function visiblePages(currentPage: number, totalPages: number) {
  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1,
  );

  return pages.reduce<(number | "ellipsis")[]>((items, page, index) => {
    const previous = pages[index - 1];
    if (previous && page - previous > 1) items.push("ellipsis");
    items.push(page);
    return items;
  }, []);
}

function CatalogPagination({
  currentPage,
  totalPages,
  params,
}: {
  currentPage: number;
  totalPages: number;
  params: Record<string, string | string[] | undefined>;
}) {
  if (totalPages <= 1) return null;

  const controlClass =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line-strong px-3 text-sm font-semibold transition-colors hover:border-rose hover:text-rose";

  return (
    <nav
      aria-label="Paginação do catálogo"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      {currentPage > 1 ? (
        <Link
          href={pageHref(params, currentPage - 1)}
          className={`${controlClass} bg-surface`}
          rel="prev"
          aria-label="Página anterior"
        >
          <span aria-hidden>←</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${controlClass} cursor-not-allowed bg-surface opacity-40`}
        >
          <span aria-hidden>←</span>
        </span>
      )}

      {visiblePages(currentPage, totalPages).map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex min-h-11 min-w-8 items-center justify-center text-muted"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Link
            key={item}
            href={pageHref(params, item)}
            aria-current={item === currentPage ? "page" : undefined}
            aria-label={`Ir para a página ${item}`}
            className={`${controlClass} ${
              item === currentPage
                ? "border-rose bg-rose text-white hover:bg-rose-deep hover:text-white"
                : "bg-surface"
            }`}
          >
            {item}
          </Link>
        ),
      )}

      {currentPage < totalPages ? (
        <Link
          href={pageHref(params, currentPage + 1)}
          className={`${controlClass} bg-surface`}
          rel="next"
          aria-label="Próxima página"
        >
          <span aria-hidden>→</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${controlClass} cursor-not-allowed bg-surface opacity-40`}
        >
          <span aria-hidden>→</span>
        </span>
      )}
    </nav>
  );
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const currentPage = pageNumber(params.pagina);

  const filters = {
    q: first(params.q),
    categoria: first(params.categoria),
    genero: first(params.genero),
    familia: first(params.familia),
  };

  const [catalog, categories, families] = await Promise.all([
    getCatalogProducts(filters, currentPage, CATALOG_PAGE_SIZE),
    getCategories(),
    getOlfactoryFamilies(),
  ]);

  const { products, total } = catalog;
  const totalPages = Math.ceil(total / CATALOG_PAGE_SIZE);

  if (totalPages > 0 && currentPage > totalPages) {
    redirect(pageHref(params, totalPages));
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Catálogo
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
          Encontre perfumes, cosméticos, eletrônicos e acessórios selecionados
          pela Rose Imports.
        </p>
      </header>

      <section className="mt-8">
        <Suspense fallback={<div className="h-24" />}>
          <CatalogFilters
            categories={categories}
            families={families}
          />
        </Suspense>
      </section>

      <div className="mt-5 flex items-center border-b border-line pb-4">
        <p
          className="text-sm text-muted"
          role="status"
          aria-live="polite"
        >
          {total === 1
            ? "1 produto encontrado"
            : `${total} produtos encontrados`}
        </p>
      </div>

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

      <CatalogPagination
        currentPage={currentPage}
        totalPages={totalPages}
        params={params}
      />
    </main>
  );
}
