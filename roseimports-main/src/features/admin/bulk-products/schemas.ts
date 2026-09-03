import { z } from "zod";

const concentrationSchema = z.enum(["EDP", "EDT", "Parfum"]).nullable();

const componentSchema = z.object({
  type: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120).nullable(),
  volumeMl: z.number().int().positive().max(9999).nullable(),
  quantity: z.number().int().positive().max(999).nullable(),
});

const variantFields = {
  quantity: z.number().int().min(1).max(9999),
  variantLabel: z.string().trim().min(1).max(120),
  concentration: concentrationSchema,
  volumeMl: z.number().int().positive().max(9999).nullable(),
  variantType: z.enum(["full", "decant"]),
  isKit: z.boolean(),
  components: z.array(componentSchema).max(50),
};

const requiredProductFields = {
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().min(1).max(80),
  categoryId: z.string().uuid(),
  productType: z.enum(["perfume", "body_splash", "cosmetico"]),
  gender: z.enum(["feminino", "masculino", "unissex"]),
};

const productPresentationFields = {
  olfactoryFamilyId: z.string().uuid().nullable(),
  description: z.string().trim().max(3000).nullable(),
  featured: z.boolean(),
  promotional: z.boolean(),
};

const createProductSchema = z.object({
  action: z.literal("create_inactive_product"),
  ...requiredProductFields,
  ...productPresentationFields,
  ...variantFields,
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).min(2).max(80),
});

const createProductWithSaleDataSchema = z.object({
  action: z.literal("create_product_with_sale_data"),
  ...requiredProductFields,
  ...productPresentationFields,
  ...variantFields,
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).min(2).max(80),
  priceCents: z.number().int().positive().max(100_000_00),
  availableForSale: z.literal(true),
});

const createVariantSchema = z.object({
  action: z.literal("create_inactive_variant"),
  ...requiredProductFields,
  ...variantFields,
  productId: z.string().uuid(),
});

const incrementVariantSchema = z.object({
  action: z.literal("increment_existing_variant"),
  ...requiredProductFields,
  quantity: z.number().int().min(1).max(9999),
  variantId: z.string().uuid(),
});

export const analyzeBulkProductsSchema = z.object({
  input: z.string().trim().min(1).max(200_000),
});

export const confirmBulkProductsSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    items: z
      .array(
        z.discriminatedUnion("action", [
          createProductSchema,
          createProductWithSaleDataSchema,
          createVariantSchema,
          incrementVariantSchema,
        ]),
      )
      .min(1)
      .max(500),
  })
  .superRefine((value, context) => {
    value.items.forEach((item, index) => {
      if (
        item.action !== "increment_existing_variant" &&
        !item.isKit &&
        item.components.length > 0
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Componentes só podem ser associados a kits.",
          path: ["items", index, "components"],
        });
      }
    });
  });

export type ConfirmBulkProductsInput = z.infer<typeof confirmBulkProductsSchema>;
