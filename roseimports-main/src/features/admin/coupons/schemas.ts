import { z } from "zod";

import { COUPON_CODE_REGEX, normalizeCouponCode } from "@/lib/coupons";

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const optionalInstant = z.preprocess(
  emptyToNull,
  z
    .string()
    .datetime({ offset: true, message: "Data inválida." })
    .nullable(),
);

/* ---------------------------------------------------------------
   Influenciador
---------------------------------------------------------------- */

export const influencerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do influenciador.")
    .max(80, "Nome muito longo."),

  handle: z.preprocess(
    emptyToNull,
    z.string().trim().max(60).nullable(),
  ),

  notes: z.preprocess(
    emptyToNull,
    z.string().trim().max(500).nullable(),
  ),

  active: z.boolean(),
});

export type InfluencerInput = z.infer<typeof influencerSchema>;

/* ---------------------------------------------------------------
   Cupom

   O código é normalizado antes de validar, então "duda10" digitado no
   painel e "DUDA10" digitado no checkout chegam na mesma linha.
---------------------------------------------------------------- */

export const couponSchema = z
  .object({
    code: z
      .string()
      .transform(normalizeCouponCode)
      .refine(
        (value) => COUPON_CODE_REGEX.test(value),
        "O código aceita de 3 a 24 caracteres, entre letras, números e hífen — sem espaço.",
      ),

    discountPercent: z.preprocess(
      (value) => (value === "" || value === null ? undefined : Number(value)),
      z
        .number({ invalid_type_error: "Informe a porcentagem de desconto." })
        .int("A porcentagem precisa ser um número inteiro.")
        .min(1, "O desconto mínimo é 1%.")
        .max(100, "O desconto máximo é 100%."),
    ),

    influencerId: z.preprocess(
      emptyToNull,
      z.string().uuid("Escolha um influenciador válido.").nullable(),
    ),

    startsAt: optionalInstant,
    expiresAt: optionalInstant,

    maxUses: z.preprocess(
      (value) => (value === "" || value === null ? null : Number(value)),
      z
        .number()
        .int("O limite de usos precisa ser um número inteiro.")
        .positive("O limite de usos precisa ser maior que zero.")
        .max(1_000_000, "Limite de usos acima do razoável.")
        .nullable(),
    ),

    showInShowcase: z.boolean(),
    active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      data.startsAt &&
      data.expiresAt &&
      new Date(data.expiresAt) <= new Date(data.startsAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "A validade precisa terminar depois do início.",
      });
    }
  });

export type CouponInput = z.infer<typeof couponSchema>;
