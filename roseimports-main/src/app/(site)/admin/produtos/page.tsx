import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { getCatalogCounts } from "@/features/admin/metrics";
import { ProductRowActions } from "@/features/admin/product-row-actions";
import { ProductImage } from "@/components/product-image";
import { searchOrFilters } from "@/lib/search";

export const metadata: Metadata = { title: "Produtos" };
export const dynamic = "force-dynamic";

type ProductImageRow = {
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
};

type Row = {
  id: string;
  name: string;
  brand: string | null;
  active: boolean;
  featured: boolean;
  promotional: boolean;

  categories: {
    name: string;
  } | null;

  product_variants: {
    id: string;
    stock_quantity: number;
    active: boolean;
  }[];

  product_images: ProductImageRow[];
};

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
  }>;
}) {
  await requireAdminUser();

  const { q = "" } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(`
      id,
      name,
      brand,
      active,
      featured,
      promotional,
      categories (
        name
      ),
      product_variants (
        id,
        stock_quantity,
        active
      ),
      product_images (
        storage_path,
        alt_text,
        sort_order
      )
    `)
    .order("name");

  // Termo escapado e quebrado em palavras: vírgula, parêntese e ponto são
  // sintaxe do PostgREST e quebrariam a consulta se fossem interpolados.
  for (const filter of searchOrFilters(q)) {
    query = query.or(filter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const products = (data ?? []) as unknown as Row[];

  // Mesma fonte da tela de Estoque: os dois painéis não podem discordar.
  // Vale o catálogo inteiro, não a busca corrente — é um resumo da loja.
  const counts = await getCatalogCounts();

  const semEstoque = products.filter(
    (product) => {
      const activeVariants =
        product.product_variants.filter(
          (variant) => variant.active,
        );

      const stock = activeVariants.reduce(
        (sum, variant) =>
          sum + variant.stock_quantity,
        0,
      );

      return (
        product.active &&
        activeVariants.length > 0 &&
        stock <= 0
      );
    },
  ).length;

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}

      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">
            Catálogo
          </p>

          <h1 className="mt-1 text-2xl">
            Produtos
          </h1>

          <p className="mt-2 max-w-xl text-sm text-muted">
            Gerencie os produtos, preços, estoque,
            imagens e disponibilidade no catálogo.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/produtos/cadastro-em-lote"
            className="inline-flex w-fit items-center justify-center border border-line px-5 py-3 text-xs font-medium tracking-[0.1em] text-ink uppercase transition-colors hover:bg-white"
          >
            Cadastro em lote
          </Link>
          <Link
            href="/admin/produtos/novo"
            className="inline-flex w-fit items-center justify-center bg-ink px-5 py-3 text-xs font-medium tracking-[0.1em] text-ivory uppercase transition-opacity hover:opacity-90"
          >
            + Novo produto
          </Link>
        </div>
      </header>

      {/* RESUMO */}

      <section
        className="
          grid grid-cols-2 gap-px
          overflow-hidden
          border border-line
          bg-line
          lg:grid-cols-4
        "
      >
        <SummaryItem
          label="Produtos cadastrados"
          value={counts.produtosTotal}
        />

        <SummaryItem
          label="Produtos ativos"
          value={counts.produtosAtivos}
        />

        <SummaryItem
          label="Produtos inativos"
          value={counts.produtosTotal - counts.produtosAtivos}
        />

        <SummaryItem
          label="Ativos sem estoque"
          value={semEstoque}
        />
      </section>

      {/* BUSCA */}

      <form
        action="/admin/produtos"
        method="get"
        role="search"
        className="flex w-full max-w-xl gap-2"
      >
        <label
          htmlFor="q"
          className="sr-only"
        >
          Buscar produto
        </label>

        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por nome ou marca..."
          className="
            h-11 flex-1
            border border-line
            bg-surface
            px-3
            text-sm
            outline-none
            transition
            placeholder:text-muted
            focus:border-line-strong
          "
        />

        <button
          type="submit"
          className="
            h-11 bg-ink px-5
            text-xs font-medium
            tracking-[0.08em]
            text-ivory uppercase
            transition-opacity
            hover:opacity-90
          "
        >
          Buscar
        </button>

        {q && (
          <Link
            href="/admin/produtos"
            className="
              flex h-11 items-center
              px-2
              text-xs text-muted
              hover:text-ink
            "
          >
            Limpar
          </Link>
        )}
      </form>

      {/* RESULTADO */}

      {q && (
        <p className="text-xs text-muted">
          {products.length === 1
            ? "1 produto encontrado"
            : `${products.length} produtos encontrados`}{" "}
          para{" "}
          <span className="font-medium text-ink">
            “{q}”
          </span>
        </p>
      )}

      {/* TABELA */}

      {products.length > 0 ? (
        <div className="overflow-hidden border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <Th>Produto</Th>
                  <Th>Categoria</Th>
                  <Th>Estoque</Th>
                  <Th>Situação</Th>
                  <Th>Ações</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {products.map(
                  (product) => {
                    const variants =
                      product.product_variants;

                    const activeVariants =
                      variants.filter(
                        (variant) =>
                          variant.active,
                      );

                    const totalStock =
                      activeVariants.reduce(
                        (sum, variant) =>
                          sum +
                          variant.stock_quantity,
                        0,
                      );

                    const images = [
                      ...(product.product_images ??
                        []),
                    ].sort(
                      (a, b) =>
                        a.sort_order -
                        b.sort_order,
                    );

                    const cover =
                      images[0] ?? null;

                    return (
                      <tr
                        key={product.id}
                        className={`
                          transition-colors
                          hover:bg-ivory/40
                          ${
                            product.active
                              ? ""
                              : "opacity-55"
                          }
                        `}
                      >
                        {/* PRODUTO */}

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-ivory">
                              <ProductImage
                                path={
                                  cover?.storage_path ??
                                  null
                                }
                                alt={
                                  cover?.alt_text ??
                                  product.name
                                }
                                sizes="48px"
                              />
                            </div>

                            <div className="min-w-0">
                              <Link
                                href={`/admin/produtos/${product.id}`}
                                className="
                                  block max-w-[18rem]
                                  truncate
                                  font-medium
                                  text-ink
                                  transition-colors
                                  hover:text-rose
                                "
                              >
                                {product.name}
                              </Link>

                              {product.brand && (
                                <span className="mt-0.5 block text-xs text-muted">
                                  {
                                    product.brand
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* CATEGORIA */}

                        <td className="px-4 py-3 text-muted">
                          {product.categories
                            ?.name ?? "—"}
                        </td>

                        {/* ESTOQUE */}

                        <td className="px-4 py-3">
                          {variants.length ===
                          0 ? (
                            <span className="text-xs text-danger">
                              Sem versões
                            </span>
                          ) : (
                            <div>
                              <p className="text-sm text-ink">
                                {totalStock} un.
                              </p>

                              <p className="mt-0.5 text-xs text-muted">
                                {
                                  activeVariants.length
                                }{" "}
                                {activeVariants.length ===
                                1
                                  ? "versão"
                                  : "versões"}
                              </p>
                            </div>
                          )}
                        </td>

                        {/* SITUAÇÃO */}

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {product.active ? (
                              <Tag tone="success">
                                Ativo
                              </Tag>
                            ) : (
                              <Tag tone="muted">
                                Inativo
                              </Tag>
                            )}

                            {product.featured && (
                              <Tag tone="rose">
                                Destaque
                              </Tag>
                            )}

                            {product.promotional && (
                              <Tag tone="gold">
                                Promoção
                              </Tag>
                            )}

                            {product.active &&
                              variants.length >
                                0 &&
                              totalStock <= 0 && (
                                <Tag tone="danger">
                                  Sem estoque
                                </Tag>
                              )}
                          </div>
                        </td>

                        {/* AÇÕES */}

                        <td className="px-4 py-3">
                          <ProductRowActions
                            productId={
                              product.id
                            }
                            active={
                              product.active
                            }
                            featured={
                              product.featured
                            }
                          />
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-line bg-surface px-5 py-14 text-center">
          <p className="text-sm font-medium text-ink">
            {q
              ? "Nenhum produto encontrado"
              : "Nenhum produto cadastrado"}
          </p>

          <p className="mt-1 text-xs text-muted">
            {q
              ? "Tente pesquisar por outro nome ou marca."
              : "Comece cadastrando o primeiro produto da loja."}
          </p>

          {!q && (
            <Link
              href="/admin/produtos/novo"
              className="mt-4 inline-block text-xs font-medium text-rose hover:underline"
            >
              Cadastrar produto
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-surface px-4 py-4">
      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-1 text-xl font-medium text-ink">
        {value}
      </p>
    </div>
  );
}

function Th({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-4 py-3 text-xs font-normal tracking-[0.08em] text-muted uppercase">
      {children}
    </th>
  );
}

function Tag({
  tone,
  children,
}: {
  tone:
    | "muted"
    | "rose"
    | "gold"
    | "success"
    | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    muted:
      "bg-ivory-deep text-muted",

    rose:
      "bg-rose-wash text-rose",

    gold:
      "bg-gold-soft/30 text-gold",

    success:
      "bg-success/10 text-success",

    danger:
      "bg-danger/10 text-danger",
  } as const;

  return (
    <span
      className={`
        px-2 py-0.5
        text-[0.625rem]
        tracking-[0.08em]
        uppercase
        ${styles[tone]}
      `}
    >
      {children}
    </span>
  );
}
