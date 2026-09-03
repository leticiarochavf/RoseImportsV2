export type CatalogQueryError = {
  code?: string;
  message: string;
};

type CatalogQueryResult<T> = {
  data: T | null;
  error: CatalogQueryError | null;
};

export type CatalogSchemaMode = "full" | "legacy";

export async function loadCatalogWithLegacyFallback<TFull, TLegacy>(
  loadFull: () => PromiseLike<CatalogQueryResult<TFull>>,
  loadLegacy: () => PromiseLike<CatalogQueryResult<TLegacy>>,
): Promise<
  | { data: TFull; mode: "full"; error: null }
  | { data: TLegacy; mode: "legacy"; error: null }
  | { data: null; mode: null; error: CatalogQueryError }
> {
  const full = await loadFull();

  if (!full.error && full.data !== null) {
    return { data: full.data, mode: "full", error: null };
  }

  if (!full.error || !isMissingBulkImportSchemaError(full.error)) {
    return {
      data: null,
      mode: null,
      error: full.error ?? { message: "empty_catalog_response" },
    };
  }

  const legacy = await loadLegacy();
  if (!legacy.error && legacy.data !== null) {
    return { data: legacy.data, mode: "legacy", error: null };
  }

  return {
    data: null,
    mode: null,
    error: legacy.error ?? { message: "empty_legacy_catalog_response" },
  };
}

function isMissingBulkImportSchemaError(error: CatalogQueryError): boolean {
  if (error.code === "42703") return true;

  return (
    ["PGRST200", "PGRST204", "PGRST205"].includes(error.code ?? "") &&
    /concentration|is_kit|product_variant_kit_items|bulk_product_imports/i.test(
      error.message,
    )
  );
}
