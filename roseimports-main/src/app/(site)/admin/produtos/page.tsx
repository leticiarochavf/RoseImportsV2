import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { ProductRowActions } from "@/features/admin/product-row-actions";

export const metadata: Metadata = { title: "Produtos" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  brand: string | null;
  active: boolean;
  featured: boolean;
  promotional: boolean;
  categories: { name: string } | null;
  product_variants: { id: string; stock_quantity: number; active: boolean }[];
};

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Painel exige perfil de administrador, não só sessão. (§34)
  await requireAdminUser();

  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      "id, name, brand, active, featured, promotional, categories ( name ), product_variants ( id, stock_quantity, active )",
    )
    .order("name");

  if (q?.trim()) {
    query = query.or(`name.ilike.%${q.trim()}%,brand.ilike.%${q.trim()}%`);
  }

  const { data } = await query;
  const products = (data ?? []) as unknown as Row[];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1 className="mt-1 text-2xl">Produtos</h1>
        </div>

        <Link
          href="/admin/produtos/novo"
          className="bg-ink px-6 py-3 text-xs tracking-[0.14em] text-ivory uppercase transition-opacity hover:opacity-85"
        >
          Novo produto
        </Link>
      </header>

      <form className="mt-6" role="search">
        <label htmlFor="q" className="sr-only">
          Buscar produto
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome ou marca"
          className="w-full max-w-sm border border-line bg-surface px-4 py-2.5 text-sm focus:border-rose focus:outline-none"
        />
      </form>

      {products.length > 0 ? (
        <div className="mt-6 overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Produto</Th>
                <Th>Categoria</Th>
                <Th>Versões</Th>
                <Th>Situação</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => {
                const variants = product.product_variants;
                const totalStock = variants.reduce(
                  (sum, v) => sum + v.stock_quantity,
                  0,
                );

                return (
                  <tr
                    key={product.id}
                    className={product.active ? "" : "opacity-55"}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/produtos/${product.id}`}
                        className="hover:text-rose"
                      >
                        {product.name}
                      </Link>
                      {product.brand && (
                        <span className="block text-xs text-muted">
                          {product.brand}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {product.categories?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {variants.length === 0 ? (
                        <span className="text-danger">Sem versões</span>
                      ) : (
                        `${variants.length} · ${totalStock} un.`
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {!product.active && (
                          <Tag tone="muted">Inativo</Tag>
                        )}
                        {product.featured && <Tag tone="rose">Destaque</Tag>}
                        {product.promotional && <Tag tone="gold">Promoção</Tag>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ProductRowActions
                        productId={product.id}
                        active={product.active}
                        featured={product.featured}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 border border-line bg-surface px-5 py-12 text-center text-sm text-muted">
          {q
            ? `Nenhum produto encontrado para "${q}".`
            : "Nenhum produto cadastrado ainda."}
        </p>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-normal tracking-[0.1em] text-muted uppercase">
      {children}
    </th>
  );
}

function Tag({
  tone,
  children,
}: {
  tone: "muted" | "rose" | "gold";
  children: React.ReactNode;
}) {
  const styles = {
    muted: "bg-ivory-deep text-muted",
    rose: "bg-rose-wash text-rose",
    gold: "bg-gold-soft/30 text-gold",
  } as const;

  return (
    <span className={`px-2 py-0.5 text-[0.625rem] tracking-[0.1em] uppercase ${styles[tone]}`}>
      {children}
    </span>
  );
}
