import { z } from "zod";

/* ---------------------------------------------------------------
   Pré-pedido
---------------------------------------------------------------- */

export const orderItemInputSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""));

export const createOrderSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(2, "Informe seu nome.")
      .max(80, "Nome muito longo."),

    fulfillmentType: z.enum([
      "retirada",
      "entrega",
    ]),

    neighborhood: optionalText(80),
    cep: optionalText(9),
    street: optionalText(120),
    number: optionalText(20),
    complement: optionalText(80),
    city: optionalText(80),
    state: optionalText(2),

    paymentMethod: z.enum([
      "pix",
      "dinheiro",
      "cartao",
    ]),

    items: z
      .array(orderItemInputSchema)
      .min(1, "Seu carrinho está vazio.")
      .max(30, "Muitos itens no pedido."),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentType !== "entrega") {
      return;
    }

    const require = (
      field: string,
      ok: boolean,
      message: string,
    ) => {
      if (!ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: [field],
        });
      }
    };

    const digits = (data.cep ?? "").replace(
      /\D/g,
      "",
    );

    require(
      "cep",
      digits.length === 8,
      "Informe um CEP válido (8 dígitos).",
    );

    require(
      "street",
      (data.street?.trim().length ?? 0) >= 2,
      "Informe a rua.",
    );

    require(
      "number",
      (data.number?.trim().length ?? 0) >= 1,
      "Informe o número.",
    );

    require(
      "neighborhood",
      (data.neighborhood?.trim().length ?? 0) >= 2,
      "Informe o bairro.",
    );

    require(
      "city",
      (data.city?.trim().length ?? 0) >= 2,
      "Informe a cidade.",
    );

    require(
      "state",
      (data.state?.trim().length ?? 0) === 2,
      "Informe a UF (2 letras).",
    );
  });

export type CreateOrderInput = z.infer<
  typeof createOrderSchema
>;

/* ---------------------------------------------------------------
   Admin — produto
---------------------------------------------------------------- */

const emptyToNull = (value: unknown) =>
  typeof value === "string" &&
  value.trim() === ""
    ? null
    : value;

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do produto.")
    .max(120),

  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9-]+$/,
      "O endereço só aceita letras minúsculas, números e hífen.",
    )
    .min(2)
    .max(80),

  brand: z.preprocess(
    emptyToNull,
    z.string().trim().max(80).nullable(),
  ),

  categoryId: z
    .string()
    .uuid("Escolha uma categoria."),

  productType: z.enum([
    "perfume",
    "body_splash",
    "cosmetico",
  ]),

  gender: z.preprocess(
    emptyToNull,
    z
      .enum([
        "feminino",
        "masculino",
        "unissex",
      ])
      .nullable(),
  ),

  olfactoryFamilyId: z.preprocess(
    emptyToNull,
    z.string().uuid().nullable(),
  ),

  description: z.preprocess(
    emptyToNull,
    z.string().trim().max(3000).nullable(),
  ),

  active: z.boolean(),
  featured: z.boolean(),
  promotional: z.boolean(),
});

export type ProductInput = z.infer<
  typeof productSchema
>;

/* ---------------------------------------------------------------
   Admin — variante

   O usuário não escolhe mais:
   - tipo da variante
   - ordem

   Esses valores são definidos automaticamente pelo servidor.
---------------------------------------------------------------- */

export const variantSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Informe o nome da versão.")
    .max(60),

  volumeMl: z.preprocess(
    (value) =>
      value === "" || value === null
        ? null
        : Number(value),

    z
      .number()
      .int()
      .positive("Volume inválido.")
      .nullable(),
  ),

  priceCents: z
    .number()
    .int()
    .positive(
      "Informe um preço maior que zero.",
    )
    .max(
      100_000_00,
      "Preço acima do limite.",
    ),

  stockQuantity: z
    .number()
    .int()
    .min(
      0,
      "O estoque não pode ser negativo.",
    )
    .max(9999),

  active: z.boolean(),
});

export type VariantInput = z.infer<
  typeof variantSchema
>;

/* ---------------------------------------------------------------
   Admin — estoque e status
---------------------------------------------------------------- */

export const stockUpdateSchema = z.object({
  variantId: z.string().uuid(),

  stockQuantity: z
    .number()
    .int()
    .min(0)
    .max(9999),
});

export const priceUpdateSchema = z.object({
  variantId: z.string().uuid(),

  priceCents: z
    .number()
    .int()
    .positive()
    .max(100_000_00),
});

export const statusUpdateSchema = z.object({
  orderId: z.string().uuid(),

  status: z.enum([
    "novo",
    "em_atendimento",
    "pago",
    "entregue",
    "retirado",
    "cancelado",
  ]),
});