/**
 * Regras de cupom que valem nos dois lados.
 *
 * O cálculo do desconto que conta é o do banco, dentro da transação do
 * pedido. O que está aqui serve para a prévia na tela, para o painel e
 * para gravar o código já normalizado — nunca para decidir quanto o
 * cliente paga. (§62: dinheiro em centavos, inteiro, sempre)
 */

/**
 * Mesmo formato do CHECK em coupons.code: 3 a 24 caracteres, letras
 * maiúsculas, números e hífen no meio.
 */
export const COUPON_CODE_REGEX = /^[A-Z0-9][A-Z0-9-]{2,23}$/;

/**
 * "  duda10 " e "DUDA10" viram a mesma coisa. É o que o admin grava e o
 * que o checkout procura, então os dois sempre batem.
 */
export function normalizeCouponCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidCouponCode(input: string): boolean {
  return COUPON_CODE_REGEX.test(normalizeCouponCode(input));
}

/**
 * Desconto em centavos. Arredonda meio para cima, igual ao round() do
 * Postgres, para a prévia da tela não divergir do valor gravado.
 */
export function computeDiscountCents(
  subtotalCents: number,
  discountPercent: number,
): number {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) return 0;
  if (!Number.isInteger(discountPercent)) return 0;
  if (discountPercent < 1 || discountPercent > 100) return 0;

  const discount = Math.round((subtotalCents * discountPercent) / 100);

  // 100% zera o pedido, nunca deixa negativo.
  return Math.min(discount, subtotalCents);
}

export type CouponAvailability =
  | "disponivel"
  | "inativo"
  | "agendado"
  | "expirado"
  | "esgotado";

export type CouponWindow = {
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  usesReserved: number;
};

/**
 * Por que um cupom não pode ser usado agora. A mesma ordem de verificação
 * do banco, para a mensagem do painel combinar com a recusa no checkout.
 */
export function couponAvailability(
  coupon: CouponWindow,
  now: Date = new Date(),
): CouponAvailability {
  if (!coupon.active) return "inativo";

  const at = now.getTime();

  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > at) {
    return "agendado";
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= at) {
    return "expirado";
  }

  if (coupon.maxUses !== null && coupon.usesReserved >= coupon.maxUses) {
    return "esgotado";
  }

  return "disponivel";
}

export const COUPON_AVAILABILITY_LABEL: Record<CouponAvailability, string> = {
  disponivel: "Disponível",
  inativo: "Inativo",
  agendado: "Agendado",
  expirado: "Expirado",
  esgotado: "Esgotado",
};
