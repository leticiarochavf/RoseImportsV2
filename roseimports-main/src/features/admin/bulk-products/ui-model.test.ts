import { describe, expect, it } from "vitest";

import type { BulkProductAnalysis } from "./dedupe";
import {
  buildConfirmItems,
  createEditableItems,
  duplicateEditableItem,
  getItemConfirmationBlockers,
  isItemConfirmable,
  type EditableBulkProduct,
} from "./ui-model";

function analysis(
  overrides: Partial<BulkProductAnalysis> = {},
): BulkProductAnalysis & { categoryId: string | null } {
  return {
    source: "Lattafa Jasoor EDP 100 ml",
    sourceLine: 1,
    name: "Lattafa Jasoor",
    brand: "Lattafa",
    line: "Jasoor",
    concentration: "EDP",
    productType: "perfume",
    gender: "masculino",
    categorySlug: "perfumes",
    variantType: "full",
    variantLabel: "100 ml",
    volumeMl: 100,
    quantity: 2,
    isKit: false,
    components: [],
    variations: [],
    normalizedName: "lattafa jasoor",
    slug: "lattafa-jasoor",
    issues: [],
    status: "new_product",
    proposedAction: "create_inactive_product",
    matchedProductId: null,
    matchedVariantId: null,
    requiresPriceReview: true,
    candidates: [],
    reasons: [],
    categoryId: "90000000-0000-4000-8000-000000000001",
    ...overrides,
  };
}

const categoryIds = {
  perfumes: "90000000-0000-4000-8000-000000000001",
  cosmeticos: "90000000-0000-4000-8000-000000000002",
};

describe("modelo da revisão do cadastro em lote", () => {
  it("prepara produtos novos para venda e mantém duplicidades em revisão", () => {
    const items = createEditableItems([
      analysis(),
      analysis({
        status: "existing_product",
        proposedAction: "increment_existing_variant",
        matchedVariantId: "20000000-0000-4000-8000-000000000001",
      }),
      analysis({
        status: "possible_duplicate",
        proposedAction: null,
      }),
      analysis({
        status: "incomplete",
        proposedAction: null,
      }),
    ]);

    expect(items.map((item) => item.selected)).toEqual([true, true, false, false]);
    expect(items.map((item) => item.decision.type)).toEqual([
      "create_product_with_sale_data",
      "increment_variant",
      "review",
      "review",
    ]);
    expect(items[0]?.availableForSale).toBe(true);
  });

  it("não libera dado incompleto sem edição e decisão manual", () => {
    const [item] = createEditableItems([
      analysis({
        status: "incomplete",
        proposedAction: null,
        reasons: ["shared_quantity_between_variations"],
      }),
    ]);
    expect(item).toBeDefined();
    expect(isItemConfirmable(item!, categoryIds)).toBe(false);

    const reviewed: EditableBulkProduct = {
      ...item!,
      name: "Yara Tous",
      quantity: 4,
      reviewed: true,
      selected: true,
      decision: { type: "create_product_with_sale_data" },
      priceCents: 24990,
      availableForSale: true,
    };
    expect(isItemConfirmable(reviewed, categoryIds)).toBe(true);
  });

  it("converte decisões explícitas no payload transacional", () => {
    const items = createEditableItems([
      analysis(),
      analysis({
        status: "existing_product",
        proposedAction: "increment_existing_variant",
        matchedVariantId: "20000000-0000-4000-8000-000000000001",
      }),
    ]);
    const payload = buildConfirmItems(
      items.map((item, index) =>
        index === 0 ? { ...item, priceCents: 24990 } : item,
      ),
      categoryIds,
    );

    expect(payload).toHaveLength(2);
    expect(payload[0]).toMatchObject({
      action: "create_product_with_sale_data",
      name: "LATTAFA JASOOR",
      brand: "Lattafa",
      categoryId: categoryIds.perfumes,
      productType: "perfume",
      gender: "masculino",
      variantLabel: "100 ml",
      quantity: 2,
      priceCents: 24990,
      availableForSale: true,
    });
    expect(payload[1]).toEqual({
      action: "increment_existing_variant",
      quantity: 2,
      variantId: "20000000-0000-4000-8000-000000000001",
      name: "LATTAFA JASOOR",
      brand: "Lattafa",
      categoryId: categoryIds.perfumes,
      productType: "perfume",
      gender: "masculino",
    });
  });

  it("permite resolver possível duplicidade usando variante escolhida", () => {
    const [item] = createEditableItems([
      analysis({ status: "possible_duplicate", proposedAction: null }),
    ]);
    const resolved: EditableBulkProduct = {
      ...item!,
      reviewed: true,
      selected: true,
      decision: {
        type: "increment_variant",
        variantId: "20000000-0000-4000-8000-000000000009",
      },
    };

    expect(isItemConfirmable(resolved, categoryIds)).toBe(true);
    expect(buildConfirmItems([resolved], categoryIds)).toEqual([
      {
        action: "increment_existing_variant",
        quantity: 2,
        variantId: "20000000-0000-4000-8000-000000000009",
        name: "LATTAFA JASOOR",
        brand: "Lattafa",
        categoryId: categoryIds.perfumes,
        productType: "perfume",
        gender: "masculino",
      },
    ]);
  });

  it("bloqueia confirmação quando qualquer campo obrigatório está ausente", () => {
    const missingCases: Array<Partial<BulkProductAnalysis>> = [
      { name: "" },
      { brand: null },
      { categorySlug: null },
      { productType: null },
      { gender: null },
    ];

    for (const missing of missingCases) {
      const [item] = createEditableItems([analysis(missing)]);
      expect(isItemConfirmable(item!, categoryIds)).toBe(false);
    }
  });

  it("informa exatamente o que falta para liberar a ação", () => {
    const [item] = createEditableItems([
      analysis({
        brand: null,
        gender: null,
        status: "incomplete",
        proposedAction: null,
      }),
    ]);

    expect(
      getItemConfirmationBlockers(
        {
          ...item!,
          selected: true,
          decision: { type: "create_product_with_sale_data" },
          priceCents: 24990,
          availableForSale: true,
        },
        categoryIds,
      ),
    ).toEqual(["brand_missing", "gender_missing", "manual_review_required"]);
  });

  it("exige disponibilidade para venda mesmo quando há preço", () => {
    const [item] = createEditableItems([analysis()]);
    const base: EditableBulkProduct = {
      ...item!,
      decision: { type: "create_product_with_sale_data" },
      priceCents: 24990,
      availableForSale: false,
    };

    expect(getItemConfirmationBlockers(base, categoryIds)).toEqual([
      "sale_availability_required",
    ]);
  });

  it("não permite cadastrar produto novo pelo caminho inativo legado", () => {
    const [item] = createEditableItems([analysis()]);
    const inactive: EditableBulkProduct = {
      ...item!,
      decision: { type: "create_product" },
      availableForSale: false,
    };

    expect(getItemConfirmationBlockers(inactive, categoryIds)).toContain(
      "sale_data_required",
    );
    expect(isItemConfirmable(inactive, categoryIds)).toBe(false);
  });

  it("regenera o slug a partir do nome editado do produto novo", () => {
    const [item] = createEditableItems([analysis()]);
    const edited = {
      ...item!,
      name: "Café Árabe Nº 10",
      priceCents: 24990,
    };

    expect(buildConfirmItems([edited], categoryIds)[0]).toMatchObject({
      action: "create_product_with_sale_data",
      name: "CAFÉ ÁRABE Nº 10",
      slug: "cafe-arabe-n-10",
    });
  });

  it("normaliza em maiúsculas o nome enviado em qualquer decisão", () => {
    const [item] = createEditableItems([
      analysis({
        name: "Lattafa Jasoor",
        status: "existing_product",
        proposedAction: "increment_existing_variant",
        matchedVariantId: "20000000-0000-4000-8000-000000000001",
      }),
    ]);

    expect(buildConfirmItems([item!], categoryIds)[0]).toMatchObject({
      name: "LATTAFA JASOOR",
    });
  });

  it("cria variante com preço para venda, mas mantém a publicação dependente de foto", () => {
    const [item] = createEditableItems([analysis()]);
    const ready: EditableBulkProduct = {
      ...item!,
      decision: { type: "create_product_with_sale_data" },
      priceCents: 24990,
      availableForSale: true,
      description: "Fragrância informada pela administradora.",
      featured: true,
    };

    expect(buildConfirmItems([ready], categoryIds)[0]).toMatchObject({
      action: "create_product_with_sale_data",
      priceCents: 24990,
      availableForSale: true,
      description: "Fragrância informada pela administradora.",
      featured: true,
      promotional: false,
    });
  });

  it("não libera preço e estoque sem um preço real", () => {
    const [item] = createEditableItems([analysis()]);
    const incomplete: EditableBulkProduct = {
      ...item!,
      decision: { type: "create_product_with_sale_data" },
      priceCents: null,
      availableForSale: true,
    };

    expect(isItemConfirmable(incomplete, categoryIds)).toBe(false);
  });

  it("duplica agrupamento para permitir distribuição manual sem confirmá-lo", () => {
    const [item] = createEditableItems([
      analysis({
        status: "incomplete",
        proposedAction: null,
        variations: ["Yara Tous", "Yara Candy"],
      }),
    ]);
    const duplicate = duplicateEditableItem(item!, "manual-copy");

    expect(duplicate.clientId).toBe("manual-copy");
    expect(duplicate.selected).toBe(false);
    expect(duplicate.reviewed).toBe(false);
    expect(duplicate.decision).toEqual({ type: "review" });
  });
});
