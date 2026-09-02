import { describe, expect, it } from "vitest";

import type { BulkProductAnalysis } from "./dedupe";
import {
  buildConfirmItems,
  createEditableItems,
  duplicateEditableItem,
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
    categorySlug: "perfumes",
    variantType: "full",
    variantLabel: "EDP 100 ml",
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
  it("seleciona automaticamente apenas propostas seguras", () => {
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
      "create_product",
      "increment_variant",
      "review",
      "review",
    ]);
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
      decision: { type: "create_product" },
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
    const payload = buildConfirmItems(items, categoryIds);

    expect(payload).toHaveLength(2);
    expect(payload[0]).toMatchObject({
      action: "create_inactive_product",
      name: "Lattafa Jasoor",
      categoryId: categoryIds.perfumes,
      quantity: 2,
    });
    expect(payload[1]).toEqual({
      action: "increment_existing_variant",
      quantity: 2,
      variantId: "20000000-0000-4000-8000-000000000001",
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
      },
    ]);
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
