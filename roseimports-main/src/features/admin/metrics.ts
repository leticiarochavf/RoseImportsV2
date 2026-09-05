import { createClient } from "@/lib/supabase/server";

/* ---------------------------------------------------------------
   Contagens do catálogo, em um lugar só.

   Estoque e Produtos mostravam números próprios sob rótulos parecidos:
   uma tela contava versões e chamava de "produtos ativos", a outra
   contava produtos. Duas contagens independentes voltam a divergir na
   primeira alteração, então as duas telas passam a ler daqui.

   Definições, uma vez:

   - produtosTotal   → todo registro em products, ativo ou não.
   - produtosAtivos  → products.active = true.
   - variantesAtivas → versão ativa de um produto também ativo. Versão
                       ativa de produto desativado não está à venda e
                       não entra na conta.
   --------------------------------------------------------------- */

export type CatalogCounts = {
  produtosTotal: number;
  produtosAtivos: number;
  variantesAtivas: number;
};

export async function getCatalogCounts(): Promise<CatalogCounts> {
  const supabase = await createClient();

  const [total, ativos, variantes] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),

    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("active", true),

    // !inner força o join, para o filtro no produto valer de verdade.
    supabase
      .from("product_variants")
      .select("id, products!inner(active)", { count: "exact", head: true })
      .eq("active", true)
      .eq("products.active", true),
  ]);

  const firstError = total.error ?? ativos.error ?? variantes.error;
  if (firstError) throw new Error(firstError.message);

  return {
    produtosTotal: total.count ?? 0,
    produtosAtivos: ativos.count ?? 0,
    variantesAtivas: variantes.count ?? 0,
  };
}

/**
 * Produtos ativos, com versões ativas, cuja soma de estoque zerou.
 *
 * Fica junto das demais contagens porque é lido pelo mesmo resumo: vale o
 * catálogo inteiro, não o filtro corrente da tabela.
 */
export async function getAtivosSemEstoqueCount(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, product_variants ( stock_quantity, active )")
    .eq("active", true);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as {
    id: string;
    product_variants: { stock_quantity: number; active: boolean }[];
  }[];

  return rows.filter((row) => {
    const ativas = row.product_variants.filter((variant) => variant.active);
    if (ativas.length === 0) return false;

    return ativas.reduce((sum, variant) => sum + variant.stock_quantity, 0) <= 0;
  }).length;
}
