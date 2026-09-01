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
