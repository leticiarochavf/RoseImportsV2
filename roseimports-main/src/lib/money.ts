/**
 * Dinheiro é sempre integer em centavos, do banco até a UI. (§62)
 * Ponto flutuante só aparece na formatação final, nunca em cálculo.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** 12990 → "R$ 129,90" */
export function formatCents(cents: number): string {
  return BRL.format(cents / 100);
}

/** Para a mensagem do WhatsApp, onde "R$" já aparece no texto. */
export function formatCentsPlain(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** "129,90" ou "129.90" → 12990. Usado nos formulários do admin. */
export function parseCurrencyToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;

  // Assume vírgula como separador decimal (padrão brasileiro).
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value * 100);
}

/** 12990 → "129,90" para preencher input do admin. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
