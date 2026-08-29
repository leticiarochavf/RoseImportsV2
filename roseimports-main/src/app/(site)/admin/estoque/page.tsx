import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { StockRow } from "@/features/admin/stock-row";

export const metadata: Metadata = { title: "Estoque" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  label: string;
  price_cents: number;
  stock_quantity: number;
  active: boolean;
  sort_order: number;
  products: { name: string; active: boolean } | null;
};

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  // Painel exige perfil de administrador, não só sessão. (§34)
  await requireAdminUser();

  const { filtro } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("product_variants")
    .select(
      "id, label, price_cents, stock_quantity, active, sort_order, products ( name, active )",
    )
    .order("stock_quantity");

  const rows = ((data ?? []) as unknown as Row[])
    .filter((r) => r.products !== null)
    .sort((a, b) => {
      const byName = (a.products?.name ?? "").localeCompare(
        b.products?.name ?? "",
      );
      return byName !== 0 ? byName : a.sort_order - b.sort_order;
    });

  const criticos = rows.filter((r) => r.stock_quantity <= 2 && r.active);
  const visible = filtro === "criticos" ? criticos : rows;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Operação</p>
          <h1 className="mt-1 text-2xl">Estoque</h1>
        </div>

        <nav className="flex gap-1.5" aria-label="Filtrar estoque">
          <Link
            href="/admin/estoque"
            aria-current={filtro !== "criticos" ? "page" : undefined}
            className={`border px-3.5 py-2 text-xs tracking-[0.1em] uppercase transition-colors ${
              filtro !== "criticos"
                ? "border-ink bg-ink text-ivory"
                : "border-line bg-surface text-muted hover:border-line-strong"
            }`}
          >
            Todos
          </Link>
          <Link
            href="/admin/estoque?filtro=criticos"
            aria-current={filtro === "criticos" ? "page" : undefined}
            className={`border px-3.5 py-2 text-xs tracking-[0.1em] uppercase transition-colors ${
              filtro === "criticos"
                ? "border-ink bg-ink text-ivory"
                : "border-line bg-surface text-muted hover:border-line-strong"
            }`}
          >
            Acabando ({criticos.length})
          </Link>
        </nav>
      </header>

      <p className="mt-4 text-xs text-muted">
        Altere o valor e clique em salvar. O status que o cliente vê é
        calculado sozinho a partir da quantidade.
      </p>

      {visible.length > 0 ? (
        <div className="mt-6 overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Produto</Th>
                <Th>Preço</Th>
                <Th>Estoque real</Th>
                <Th>Status público</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((row) => (
                <StockRow
                  key={row.id}
                  variantId={row.id}
                  productName={row.products?.name ?? "—"}
                  variantLabel={row.label}
                  stockQuantity={row.stock_quantity}
                  priceCents={row.price_cents}
                  active={row.active && (row.products?.active ?? false)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 border border-line bg-surface px-5 py-12 text-center text-sm text-muted">
          {filtro === "criticos"
            ? "Nenhuma versão com estoque baixo."
            : "Nenhuma versão cadastrada ainda."}{" "}
          <Link href="/admin/produtos" className="text-rose hover:underline">
            Ir para produtos
          </Link>
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
