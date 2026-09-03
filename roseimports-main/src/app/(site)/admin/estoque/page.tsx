import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { StockRow } from "@/features/admin/stock-row";
import { getCatalogCounts } from "@/features/admin/metrics";

export const metadata: Metadata = { title: "Estoque" };
export const dynamic = "force-dynamic";

type ProductImage = {
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
};

type Row = {
  id: string;
  label: string;
  price_cents: number | null;
  stock_quantity: number;
  active: boolean;
  sort_order: number;
  products: {
    name: string;
    active: boolean;
    product_images: ProductImage[];
  } | null;
};

type Filtro = "todos" | "criticos" | "sem-estoque";

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{
    filtro?: Filtro;
    busca?: string;
  }>;
}) {
  await requireAdminUser();

  const {
    filtro = "todos",
    busca = "",
  } = await searchParams;

  const supabase = await createClient();
  const counts = await getCatalogCounts();

  const { data, error } = await supabase
    .from("product_variants")
    .select(`
      id,
      label,
      price_cents,
      stock_quantity,
      active,
      sort_order,
      products (
        name,
        active,
        product_images (
          storage_path,
          alt_text,
          sort_order
        )
      )
    `)
    .order("stock_quantity");

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as unknown as Row[])
    .filter((row) => row.products !== null)
    .sort((a, b) => {
      const byName = (a.products?.name ?? "").localeCompare(
        b.products?.name ?? "",
        "pt-BR",
      );

      return byName !== 0
        ? byName
        : a.sort_order - b.sort_order;
    });

  /*
   * Produto ativo = produto + variante ativos.
   */
  const ativos = rows.filter(
    (row) =>
      row.active &&
      (row.products?.active ?? false),
  );

  /*
   * Estoque baixo:
   * 1 ou 2 unidades.
   */
  const criticos = ativos.filter(
    (row) =>
      row.stock_quantity > 0 &&
      row.stock_quantity <= 2,
  );

  /*
   * Produtos zerados.
   */
  const semEstoque = ativos.filter(
    (row) => row.stock_quantity <= 0,
  );

  /*
   * Define qual grupo será exibido.
   */
  let visible = rows;

  if (filtro === "criticos") {
    visible = criticos;
  }

  if (filtro === "sem-estoque") {
    visible = semEstoque;
  }

  /*
   * Busca por produto ou variação.
   */
  const termoBusca = busca
    .trim()
    .toLowerCase();

  if (termoBusca) {
    visible = visible.filter((row) => {
      const productName =
        row.products?.name
          ?.toLowerCase() ?? "";

      const variantLabel =
        row.label?.toLowerCase() ?? "";

      return (
        productName.includes(termoBusca) ||
        variantLabel.includes(termoBusca)
      );
    });
  }

  /*
   * Soma total das unidades em estoque
   * dos produtos ativos.
   */
  const totalUnidades = ativos.reduce(
    (total, row) =>
      total +
      Math.max(row.stock_quantity, 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}

      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">
            Operação
          </p>

          <h1 className="mt-1 text-2xl">
            Estoque
          </h1>

          <p className="mt-2 max-w-xl text-sm text-muted">
            Consulte e altere rapidamente preço e
            quantidade dos produtos.
          </p>
        </div>

        {/* AÇÕES DO CABEÇALHO */}

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={buildExportUrl(
              filtro,
              busca,
            )}
            className="
              inline-flex items-center justify-center
              bg-ink px-4 py-2.5
              text-xs font-medium
              tracking-[0.08em]
              text-ivory uppercase
              transition
              hover:opacity-90
            "
          >
            Exportar Excel
          </Link>

          <Link
            href="/admin/produtos"
            className="
              inline-flex items-center justify-center
              border border-line-strong
              bg-surface px-4 py-2.5
              text-xs font-medium
              tracking-[0.08em] uppercase
              transition
              hover:border-ink
            "
          >
            Ver produtos
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
          md:grid-cols-5
        "
        aria-label="Resumo do estoque"
      >
        <SummaryItem
          label="Produtos ativos"
          value={counts.produtosAtivos}
        />

        <SummaryItem
          label="Versões ativas"
          value={counts.variantesAtivas}
        />

        <SummaryItem
          label="Unidades"
          value={totalUnidades}
        />

        <SummaryItem
          label="Acabando"
          value={criticos.length}
          href="/admin/estoque?filtro=criticos"
        />

        <SummaryItem
          label="Sem estoque"
          value={semEstoque.length}
          href="/admin/estoque?filtro=sem-estoque"
        />
      </section>

      {/* BUSCA + FILTROS */}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          action="/admin/estoque"
          method="get"
          className="flex w-full max-w-xl gap-2"
        >
          {filtro !== "todos" && (
            <input
              type="hidden"
              name="filtro"
              value={filtro}
            />
          )}

          <input
            type="search"
            name="busca"
            defaultValue={busca}
            placeholder="Buscar produto ou versão..."
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
              h-11
              bg-ink
              px-5
              text-xs font-medium
              tracking-[0.08em]
              text-ivory uppercase
              transition-opacity
              hover:opacity-90
            "
          >
            Buscar
          </button>

          {busca && (
            <Link
              href={
                filtro !== "todos"
                  ? `/admin/estoque?filtro=${filtro}`
                  : "/admin/estoque"
              }
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

        {/* FILTROS */}

        <nav
          className="
            flex w-fit gap-1
            border border-line
            bg-surface
            p-1
          "
          aria-label="Filtrar estoque"
        >
          <FilterLink
            href={buildFilterUrl(
              "todos",
              busca,
            )}
            active={
              filtro === "todos"
            }
          >
            Todos
          </FilterLink>

          <FilterLink
            href={buildFilterUrl(
              "criticos",
              busca,
            )}
            active={
              filtro === "criticos"
            }
          >
            Acabando

            {criticos.length > 0 && (
              <span className="ml-1 opacity-70">
                ({criticos.length})
              </span>
            )}
          </FilterLink>

          <FilterLink
            href={buildFilterUrl(
              "sem-estoque",
              busca,
            )}
            active={
              filtro ===
              "sem-estoque"
            }
          >
            Sem estoque

            {semEstoque.length > 0 && (
              <span className="ml-1 opacity-70">
                ({semEstoque.length})
              </span>
            )}
          </FilterLink>
        </nav>
      </div>

      {/* RESULTADO DA BUSCA */}

      {busca && (
        <p className="text-xs text-muted">
          {visible.length === 1
            ? "1 resultado encontrado"
            : `${visible.length} resultados encontrados`}{" "}
          para{" "}
          <span className="font-medium text-ink">
            “{busca}”
          </span>
        </p>
      )}

      {/* TABELA */}

      {visible.length > 0 ? (
        <div className="overflow-hidden border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[50rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <Th>
                    Produto
                  </Th>

                  <Th>
                    Preço
                  </Th>

                  <Th>
                    Quantidade
                  </Th>

                  <Th>
                    Status
                  </Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {visible.map((row) => {
                  /*
                   * Usa a primeira imagem
                   * pela ordem definida.
                   */
                  const images = [
                    ...(row.products
                      ?.product_images ??
                      []),
                  ].sort(
                    (a, b) =>
                      a.sort_order -
                      b.sort_order,
                  );

                  const cover =
                    images[0] ??
                    null;

                  return (
                    <StockRow
                      key={row.id}
                      variantId={
                        row.id
                      }
                      productName={
                        row.products
                          ?.name ??
                        "—"
                      }
                      productImagePath={
                        cover
                          ?.storage_path ??
                        null
                      }
                      variantLabel={
                        row.label
                      }
                      stockQuantity={
                        row.stock_quantity
                      }
                      priceCents={
                        row.price_cents
                      }
                      active={
                        row.active &&
                        (row.products
                          ?.active ??
                          false)
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ESTADO VAZIO */

        <div className="border border-line bg-surface px-5 py-14 text-center">
          <p className="text-sm font-medium text-ink">
            {busca
              ? "Nenhum produto encontrado"
              : filtro ===
                  "criticos"
                ? "Nenhum produto está acabando"
                : filtro ===
                    "sem-estoque"
                  ? "Nenhum produto está sem estoque"
                  : "Nenhum produto cadastrado"}
          </p>

          <p className="mt-1 text-xs text-muted">
            {busca
              ? "Tente pesquisar por outro nome ou versão."
              : "Os produtos cadastrados aparecerão aqui."}
          </p>

          {busca && (
            <Link
              href="/admin/estoque"
              className="
                mt-4 inline-block
                text-xs font-medium
                text-rose
                hover:underline
              "
            >
              Limpar pesquisa
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   RESUMO
---------------------------------------------------------------- */

function SummaryItem({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className="bg-surface px-4 py-4 transition hover:bg-ivory/50">
      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-1 text-xl font-medium text-ink">
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    );
  }

  return content;
}

/* ---------------------------------------------------------------
   FILTRO
---------------------------------------------------------------- */

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={
        active
          ? "page"
          : undefined
      }
      className={`
        px-3.5 py-2
        text-xs
        transition-colors
        ${
          active
            ? "bg-ink text-ivory"
            : "text-muted hover:bg-ivory hover:text-ink"
        }
      `}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------
   CABEÇALHO DA TABELA
---------------------------------------------------------------- */

function Th({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th
      className="
        px-4 py-3
        text-xs font-normal
        tracking-[0.08em]
        text-muted uppercase
      "
    >
      {children}
    </th>
  );
}

/* ---------------------------------------------------------------
   URL DOS FILTROS
---------------------------------------------------------------- */

function buildFilterUrl(
  filtro: Filtro,
  busca: string,
) {
  const params =
    new URLSearchParams();

  if (filtro !== "todos") {
    params.set(
      "filtro",
      filtro,
    );
  }

  if (busca.trim()) {
    params.set(
      "busca",
      busca.trim(),
    );
  }

  const query =
    params.toString();

  return query
    ? `/admin/estoque?${query}`
    : "/admin/estoque";
}

/* ---------------------------------------------------------------
   URL DE EXPORTAÇÃO
---------------------------------------------------------------- */

function buildExportUrl(
  filtro: Filtro,
  busca: string,
) {
  const params =
    new URLSearchParams();

  if (filtro !== "todos") {
    params.set(
      "filtro",
      filtro,
    );
  }

  if (busca.trim()) {
    params.set(
      "busca",
      busca.trim(),
    );
  }

  const query =
    params.toString();

  return query
    ? `/admin/estoque/exportar?${query}`
    : "/admin/estoque/exportar";
}
