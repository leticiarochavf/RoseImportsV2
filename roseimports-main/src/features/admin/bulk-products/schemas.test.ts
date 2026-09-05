import { describe, expect, it } from "vitest";

import { confirmBulkProductsSchema } from "./schemas";

const completeItem = {
  action: "create_inactive_product" as const,
  quantity: 2,
  name: "Lattafa Jasoor",
  slug: "lattafa-jasoor",
  brand: "Lattafa",
  categoryId: "90000000-0000-4000-8000-000000000001",
  productType: "perfume" as const,
  gender: "masculino" as const,
  variantLabel: "100 ml",
  concentration: "EDP" as const,
  volumeMl: 100,
  variantType: "full" as const,
  isKit: false,
  components: [],
  olfactoryFamilyId: null,
  description: null,
  featured: false,
  promotional: false,
};

describe("schema de confirmação do cadastro em lote", () => {
  it("aceita produto completo sem preço ou imagem no payload", () => {
    const parsed = confirmBulkProductsSchema.safeParse({
      idempotencyKey: "30000000-0000-4000-8000-000000000001",
      items: [completeItem],
    });

    expect(parsed.success).toBe(true);
    expect(completeItem).not.toHaveProperty("priceCents");
    expect(completeItem).not.toHaveProperty("image");
  });

  it("aceita produto com preço e variante disponível, mantendo imagem fora do lote", () => {
    const parsed = confirmBulkProductsSchema.safeParse({
      idempotencyKey: "30000000-0000-4000-8000-000000000001",
      items: [
        {
          ...completeItem,
          action: "create_product_with_sale_data",
          priceCents: 30_000,
          availableForSale: true,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejeita a opção com preço e estoque quando o preço não é positivo", () => {
    const parsed = confirmBulkProductsSchema.safeParse({
      idempotencyKey: "30000000-0000-4000-8000-000000000001",
      items: [
        {
          ...completeItem,
          action: "create_product_with_sale_data",
          priceCents: 0,
          availableForSale: true,
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejeita preço diferente do valor fixo de R$ 300", () => {
    const parsed = confirmBulkProductsSchema.safeParse({
      idempotencyKey: "30000000-0000-4000-8000-000000000001",
      items: [
        {
          ...completeItem,
          action: "create_product_with_sale_data",
          priceCents: 29_990,
          availableForSale: true,
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it.each(["name", "brand", "categoryId", "productType", "gender"])(
    "rejeita confirmação sem %s",
    (field) => {
      const item = { ...completeItem } as Record<string, unknown>;
      delete item[field];

      expect(
        confirmBulkProductsSchema.safeParse({
          idempotencyKey: "30000000-0000-4000-8000-000000000001",
          items: [item],
        }).success,
      ).toBe(false);
    },
  );
});
