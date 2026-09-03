import { describe, expect, it, vi } from "vitest";

import { loadCatalogWithLegacyFallback } from "./catalog-loader";

describe("carregamento do catálogo para análise em lote", () => {
  it("usa o schema completo quando as migrations estão presentes", async () => {
    const loadLegacy = vi.fn();
    const result = await loadCatalogWithLegacyFallback(
      async () => ({ data: [{ id: "full" }], error: null }),
      loadLegacy,
    );

    expect(result).toEqual({
      data: [{ id: "full" }],
      mode: "full",
      error: null,
    });
    expect(loadLegacy).not.toHaveBeenCalled();
  });

  it("repete a leitura no schema legado quando faltam objetos da migration 0008", async () => {
    const result = await loadCatalogWithLegacyFallback(
      async () => ({
        data: null,
        error: {
          code: "42703",
          message: "column product_variants.concentration does not exist",
        },
      }),
      async () => ({ data: [{ id: "legacy" }], error: null }),
    );

    expect(result).toEqual({
      data: [{ id: "legacy" }],
      mode: "legacy",
      error: null,
    });
  });

  it("não mascara falhas de autenticação ou permissão como schema legado", async () => {
    const loadLegacy = vi.fn();
    const error = { code: "42501", message: "permission denied" };
    const result = await loadCatalogWithLegacyFallback(
      async () => ({ data: null, error }),
      loadLegacy,
    );

    expect(result).toEqual({ data: null, mode: null, error });
    expect(loadLegacy).not.toHaveBeenCalled();
  });

  it("propaga falha da consulta compatível sem liberar confirmação", async () => {
    const error = { code: "PGRST205", message: "legacy query failed" };
    const result = await loadCatalogWithLegacyFallback(
      async () => ({
        data: null,
        error: {
          code: "PGRST205",
          message: "Could not find product_variant_kit_items",
        },
      }),
      async () => ({ data: null, error }),
    );

    expect(result).toEqual({ data: null, mode: null, error });
  });
});
