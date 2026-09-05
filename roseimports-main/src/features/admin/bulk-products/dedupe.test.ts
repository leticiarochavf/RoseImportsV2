import { describe, expect, it } from "vitest";

import { parseBulkProducts } from "./parser";
import {
  analyzeBulkProductRecords,
  type CatalogProductCandidate,
} from "./dedupe";

function candidate(
  overrides: Partial<CatalogProductCandidate> = {},
): CatalogProductCandidate {
  const value: CatalogProductCandidate = {
    productId: "10000000-0000-4000-8000-000000000001",
    name: "Lattafa Jasoor",
    normalizedName: "lattafa jasoor",
    normalizedCoreName: "jasoor",
    brand: "Lattafa",
    normalizedBrand: "lattafa",
    productType: "perfume",
    variants: [
      {
        variantId: "20000000-0000-4000-8000-000000000001",
        label: "EDP 100 ml",
        concentration: "EDP",
        volumeMl: 100,
        variantType: "full",
        isKit: false,
        components: [],
      },
    ],
    ...overrides,
  };

  return value;
}

describe("analyzeBulkProductRecords", () => {
  it("reconhece produto e variante existentes com identidade exata", () => {
    const parsed = parseBulkProducts(
      "Lattafa Jasoor EDP 100 ml, Masculino\nQuantidade: 2",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, [candidate()]);

    expect(analysis).toMatchObject({
      status: "existing_product",
      proposedAction: "increment_existing_variant",
      matchedProductId: "10000000-0000-4000-8000-000000000001",
      matchedVariantId: "20000000-0000-4000-8000-000000000001",
    });
  });

  it("reconhece a mesma identidade com marca em outra posição e concentração por extenso", () => {
    const parsed = parseBulkProducts(
      "Jasoor Lattafa Eau de Parfum 100 ml, Masculino\nQuantidade: 2",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, [candidate()]);

    expect(analysis).toMatchObject({
      status: "existing_product",
      proposedAction: "increment_existing_variant",
    });
  });

  it("reutiliza o produto mas propõe variante nova e inativa para outro volume", () => {
    const parsed = parseBulkProducts(
      "Lattafa Jasoor EDP 90 ml, Masculino\nQuantidade: 1",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, [candidate()]);

    expect(analysis).toMatchObject({
      status: "existing_product",
      proposedAction: "create_inactive_variant",
      matchedProductId: "10000000-0000-4000-8000-000000000001",
      matchedVariantId: null,
      requiresPriceReview: true,
    });
  });

  it("mantém miniatura separada do tamanho convencional pelo volume", () => {
    const parsed = parseBulkProducts(
      "Lattafa Jasoor, miniatura de 30 ml, Masculino\nQuantidade: 1",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, [candidate()]);

    expect(analysis).toMatchObject({
      status: "existing_product",
      proposedAction: "create_inactive_variant",
      matchedVariantId: null,
      volumeMl: 30,
    });
  });

  it("não confunde decant com variante convencional do mesmo volume", () => {
    const parsed = parseBulkProducts(
      "Lattafa Jasoor decant de 100 ml, Masculino\nQuantidade: 1",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, [candidate()]);

    expect(analysis).toMatchObject({
      status: "existing_product",
      proposedAction: "create_inactive_variant",
      matchedVariantId: null,
    });
  });

  it("não confunde perfume com cosmético ou body splash da mesma linha", () => {
    const parsed = parseBulkProducts(`
      CREMES CORPORAIS
      1 LATTAFA JASOOR BODY CREAM, 100 ML, MASCULINO
      BODY SPLASH, BODY MIST E DESODORANTES
      1 BODY SPLASH LATTAFA JASOOR, 100 ML, MASCULINO
    `);
    const analyses = analyzeBulkProductRecords(parsed, [candidate()]);

    expect(analyses.map((analysis) => analysis.status)).toEqual([
      "new_product",
      "new_product",
    ]);
  });

  it("não confunde um kit com seu perfume vendido individualmente", () => {
    const parsed = parseBulkProducts(
      "Kit Lattafa Jasoor, perfume 100 ml + spray corporal 200 ml, Masculino\nQuantidade: 1 kit",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, [candidate()]);

    expect(analysis).toMatchObject({
      status: "new_product",
      proposedAction: "create_inactive_product",
      isKit: true,
    });
  });

  it("nunca faz match automático quando a entrada não contém marca", () => {
    const parsed = parseBulkProducts(
      "PERFUMES\n1 Al Areeq Gold, 100 ml, Masculino",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, [
      candidate({
        name: "Lattafa Al Areeq Gold",
        normalizedName: "lattafa al areeq gold",
        normalizedCoreName: "al areeq gold",
        brand: "Lattafa",
        normalizedBrand: "lattafa",
      }),
    ]);

    expect(analysis).toMatchObject({
      status: "incomplete",
      proposedAction: null,
      matchedProductId: null,
      matchedVariantId: null,
    });
    expect(analysis?.candidates).toHaveLength(1);
  });

  it("mantém sem marca em revisão mesmo sem candidato no catálogo", () => {
    const parsed = parseBulkProducts(
      "PERFUMES\n1 Produto Inédito, 100 ml, Unissex",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, []);

    expect(analysis).toMatchObject({
      status: "incomplete",
      proposedAction: null,
      reasons: ["brand_missing_requires_review"],
    });
  });

  it("marca gênero ausente como dado incompleto sem inferir pelo produto", () => {
    const parsed = parseBulkProducts(
      "Lattafa Jasoor EDP 100 ml\nQuantidade: 2",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, [candidate()]);

    expect(analysis).toMatchObject({
      status: "incomplete",
      proposedAction: null,
    });
    expect(analysis?.reasons).toContain("gender_missing");
  });

  it("marca descrição genérica sem identidade suficiente como incompleta", () => {
    const parsed = parseBulkProducts(`
      BODY SPLASH, BODY MIST E DESODORANTES
      35 DESODORANTES PERFUMADOS ÁRABES FEMININOS
    `);
    const [analysis] = analyzeBulkProductRecords(parsed, []);

    expect(analysis).toMatchObject({
      status: "incomplete",
      proposedAction: null,
    });
    expect(analysis?.reasons).toContain("insufficient_product_identity");
  });

  it("marca categoria indeterminada como dado incompleto", () => {
    const parsed = parseBulkProducts(
      "Produto sem seção, 100 ml, Unissex\nQuantidade: 1",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, []);

    expect(analysis).toMatchObject({
      status: "incomplete",
      proposedAction: null,
      categorySlug: null,
    });
    expect(analysis?.reasons).toContain("category_missing");
  });

  it("marca grupos com quantidade compartilhada como incompletos", () => {
    const parsed = parseBulkProducts(
      "Variações: Yara Tous, Yara Candy, Yara Rosa e Yara Moi — Quantidade total: 13 unidades",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, []);

    expect(analysis).toMatchObject({
      status: "incomplete",
      proposedAction: null,
    });
    expect(analysis?.reasons).toContain("shared_quantity_between_variations");
  });

  it("classifica como novo quando não há candidato confiável", () => {
    const parsed = parseBulkProducts(
      "Lattafa Produto Inédito EDP 100 ml, Unissex\nQuantidade: 1",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, []);

    expect(analysis).toMatchObject({
      status: "new_product",
      proposedAction: "create_inactive_product",
      requiresPriceReview: true,
    });
  });

  it("mantém nomes apenas semelhantes como possível duplicidade", () => {
    const parsed = parseBulkProducts(
      "Armaf Club de Nuit Intense Men EDP 100 ml, Masculino\nQuantidade: 1",
    );
    const [analysis] = analyzeBulkProductRecords(parsed, [
      candidate({
        name: "Armaf Club de Nuit Intense Man",
        normalizedName: "armaf club de nuit intense man",
        normalizedCoreName: "club de nuit intense man",
        brand: "Armaf",
        normalizedBrand: "armaf",
      }),
    ]);

    expect(analysis).toMatchObject({
      status: "possible_duplicate",
      proposedAction: null,
    });
  });

  it("leva duplicidade dentro do próprio lote para revisão", () => {
    const parsed = parseBulkProducts(`
      Lattafa Jasoor EDP 100 ml, Masculino
      Quantidade: 1
      lattafa jasoor EDP 100 ml, Masculino
      Quantidade: 2
    `);
    const analyses = analyzeBulkProductRecords(parsed, []);

    expect(analyses[0]?.status).toBe("new_product");
    expect(analyses[1]).toMatchObject({
      status: "possible_duplicate",
      proposedAction: null,
      reasons: ["duplicate_in_batch"],
    });
  });
});
