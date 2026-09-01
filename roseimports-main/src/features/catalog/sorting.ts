/* ---------------------------------------------------------------
   Ordenação do catálogo.

   Vive fora de queries.ts porque a barra de filtros é um componente
   cliente, e queries.ts importa o Supabase de servidor — trazer aquele
   módulo para o cliente arrastaria o service role junto.
   --------------------------------------------------------------- */

/**
 * Ordenações que o cliente final pode escolher. "padrao" é a ordem
 * definida pela loja; as demais sobrepõem apenas naquela navegação.
 */
export type CatalogSort = "padrao" | "nome" | "preco-asc" | "preco-desc";

export const CATALOG_SORTS: { value: CatalogSort; label: string }[] = [
  { value: "padrao", label: "Padrão da loja" },
  { value: "nome", label: "Ordem alfabética" },
  { value: "preco-asc", label: "Menor preço primeiro" },
  { value: "preco-desc", label: "Maior preço primeiro" },
];

export function parseCatalogSort(value: string | undefined): CatalogSort {
  return CATALOG_SORTS.some((option) => option.value === value)
    ? (value as CatalogSort)
    : "padrao";
}

/**
 * Converte o valor em reais que vem da URL para centavos, que é como
 * todo preço trafega no projeto. Devolve null para entrada vazia ou
 * inválida, o que significa "sem limite" nesse lado da faixa.
 */
export function parsePriceParam(value: string | undefined): number | null {
  if (!value) return null;

  const normalized = value.replace(",", ".").trim();
  const reais = Number.parseFloat(normalized);

  if (!Number.isFinite(reais) || reais < 0) return null;

  return Math.round(reais * 100);
}
