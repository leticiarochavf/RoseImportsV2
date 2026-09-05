import { describe, expect, it } from "vitest";

import { translateBulkImportError } from "./error-messages";

describe("mensagens do cadastro em lote", () => {
  it("explica quando a RPC ainda não foi instalada", () => {
    const message = translateBulkImportError(
      "Could not find the function public.confirm_bulk_product_import in the schema cache (PGRST202)",
    );

    expect(message).toContain("responsável técnico");
    expect(message).not.toMatch(/migration|PGRST|\d{4}/i);
  });

  it("explica quando falta a opção de preço e estoque", () => {
    const message = translateBulkImportError("invalid_import_action");

    expect(message).toContain("responsável técnico");
    expect(message).not.toMatch(/migration|\d{4}/i);
  });

  it("orienta a migration nova quando a categoria ainda segue a regra antiga", () => {
    const message = translateBulkImportError("product_category_type_mismatch");

    expect(message).toContain("responsável técnico");
    expect(message).not.toMatch(/migration|\d{4}/i);
  });

  it("identifica conflito com produto já existente", () => {
    const message = translateBulkImportError(
      'duplicate key value violates unique constraint "products_slug_key"',
    );

    expect(message).toContain("já existe");
    expect(message).toContain("Analise");
  });

  it("explica exatamente quando há campo obrigatório inválido", () => {
    expect(translateBulkImportError("invalid_import_gender")).toContain("gênero");
    expect(translateBulkImportError("invalid_variant_label")).toContain("volume");
  });
});
