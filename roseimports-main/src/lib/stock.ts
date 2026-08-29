/**
 * Status público de estoque. (§13)
 *
 * Derivado sempre de stock_quantity — não existe campo manual.
 * A quantidade exata nunca chega ao cliente: as funções abaixo são
 * usadas no servidor e só o rótulo é serializado para o navegador.
 */

export type StockStatus = "esgotado" | "ultimas" | "disponivel";

export function stockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return "esgotado";
  if (quantity <= 2) return "ultimas";
  return "disponivel";
}

export const STOCK_LABEL: Record<StockStatus, string> = {
  esgotado: "Esgotado",
  ultimas: "Últimas unidades",
  disponivel: "Disponível",
};

export function stockLabel(quantity: number): string {
  return STOCK_LABEL[stockStatus(quantity)];
}

export function isAvailable(quantity: number): boolean {
  return quantity > 0;
}

/**
 * Status do produto no card do catálogo: o melhor status entre as
 * variantes ativas. Um perfume com 100ml esgotado mas decant em
 * estoque continua "Disponível" na listagem.
 */
export function aggregateStockStatus(quantities: number[]): StockStatus {
  if (quantities.some((q) => q >= 3)) return "disponivel";
  if (quantities.some((q) => q > 0)) return "ultimas";
  return "esgotado";
}
