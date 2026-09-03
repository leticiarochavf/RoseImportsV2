import { describe, expect, it } from "vitest";

import { translateBulkImportError } from "./error-messages";

describe("mensagens do cadastro em lote", () => {
  it("explica quando a RPC ainda não foi instalada", () => {
    expect(
      translateBulkImportError(
        "Could not find the function public.confirm_bulk_product_import in the schema cache (PGRST202)",
      ),
    ).toContain("migrations 0008, 0009, 0012, 0014 e 0015");
  });

  it("explica quando falta a opção de preço e estoque", () => {
    expect(translateBulkImportError("invalid_import_action")).toContain(
      "migration 0015",
    );
  });

  it("orienta a migration nova quando a categoria ainda segue a regra antiga", () => {
    expect(
      translateBulkImportError("product_category_type_mismatch"),
    ).toContain("migration 0014");
  });
});
