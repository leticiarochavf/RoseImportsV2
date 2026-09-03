"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import {
  analyzeBulkProductRecords,
  normalizeIdentity,
  removeBrandFromIdentity,
  type BulkProductAnalysis,
  type CatalogProductCandidate,
} from "./dedupe";
import { loadCatalogWithLegacyFallback } from "./catalog-loader";
import { translateBulkImportError } from "./error-messages";
import {
  confirmBulkProductImport,
  type BulkProductImportRpcClient,
  type BulkProductImportSummary,
} from "./import-service";
import {
  normalizeProductIdentityFromDescription,
  parseBulkProducts,
  type BulkProductConcentration,
} from "./parser";
import {
  analyzeBulkProductsSchema,
  confirmBulkProductsSchema,
  type ConfirmBulkProductsInput,
} from "./schemas";

type CatalogKitItemRow = {
  component_type: string;
  component_name: string | null;
  volume_ml: number | null;
  component_quantity: number | null;
  sort_order: number;
};

type CatalogVariantRow = {
  id: string;
  label: string;
  volume_ml: number | null;
  concentration?: BulkProductConcentration | null;
  is_kit?: boolean;
  product_variant_kit_items?: CatalogKitItemRow[];
};

type CatalogProductRow = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  product_variants: CatalogVariantRow[];
};

type CategoryRow = {
  id: string;
  slug: string;
};

type OlfactoryFamilyRow = {
  id: string;
  name: string;
};

export type BulkProductAnalysisWithCategory = BulkProductAnalysis & {
  categoryId: string | null;
};

export type AnalyzeBulkProductsResult =
  | {
      ok: true;
      items: BulkProductAnalysisWithCategory[];
      categoryIds: {
        perfumes: string | null;
        cosmeticos: string | null;
      };
      confirmationAvailable: boolean;
      schemaMode: "full" | "legacy";
      olfactoryFamilies: OlfactoryFamilyRow[];
    }
  | {
      ok: false;
      error: string;
    };

export type ConfirmBulkProductsResult =
  | {
      ok: true;
      message: string;
      summary: BulkProductImportSummary;
    }
  | {
      ok: false;
      error: string;
    };

export async function analyzeBulkProducts(
  input: string,
): Promise<AnalyzeBulkProductsResult> {
  await requireAdminUser();

  const parsedInput = analyzeBulkProductsSchema.safeParse({ input });

  if (!parsedInput.success) {
    return { ok: false, error: "Cole ao menos uma linha de produto válida." };
  }

  const records = parseBulkProducts(parsedInput.data.input);

  if (records.length === 0) {
    return { ok: false, error: "Nenhum produto foi identificado na lista." };
  }

  const supabase = await createClient();
  const [catalogResult, categoriesResult, familiesResult] = await Promise.all([
    loadCatalogWithLegacyFallback(
      async () => {
        const result = await supabase.from("products").select(`
          id,
          name,
          slug,
          brand,
          product_variants (
            id,
            label,
            volume_ml,
            concentration,
            is_kit,
            product_variant_kit_items (
              component_type,
              component_name,
              volume_ml,
              component_quantity,
              sort_order
            )
          )
        `);
        return {
          data: result.data as unknown as CatalogProductRow[] | null,
          error: result.error,
        };
      },
      async () => {
        const result = await supabase.from("products").select(`
          id,
          name,
          slug,
          brand,
          product_variants (
            id,
            label,
            volume_ml
          )
        `);
        return {
          data: result.data as unknown as CatalogProductRow[] | null,
          error: result.error,
        };
      },
    ),
    supabase.from("categories").select("id, slug").eq("active", true),
    supabase
      .from("olfactory_families")
      .select("id, name")
      .order("sort_order"),
  ]);

  if (catalogResult.error || categoriesResult.error || familiesResult.error) {
    return {
      ok: false,
      error: "Não foi possível comparar a lista com o catálogo.",
    };
  }

  const catalog = mapCatalogCandidates(catalogResult.data ?? []);
  const categoryBySlug = new Map(
    ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => [
      category.slug,
      category.id,
    ]),
  );
  const usedSlugs = new Set(
    (catalogResult.data ?? []).map((product) => product.slug),
  );
  const analyses = analyzeBulkProductRecords(records, catalog).map((item) => {
    const slug =
      item.status === "new_product" ? reserveUniqueSlug(item.slug, usedSlugs) : item.slug;

    return {
      ...item,
      slug,
      categoryId: resolveCategoryId(item.categorySlug, categoryBySlug),
    };
  });

  return {
    ok: true,
    items: analyses,
    categoryIds: {
      perfumes: categoryBySlug.get("perfumes") ?? null,
      cosmeticos: categoryBySlug.get("cosmeticos") ?? null,
    },
    confirmationAvailable: catalogResult.mode === "full",
    schemaMode: catalogResult.mode,
    olfactoryFamilies: (familiesResult.data ?? []) as OlfactoryFamilyRow[],
  };
}

export async function confirmBulkProducts(
  request: ConfirmBulkProductsInput,
): Promise<ConfirmBulkProductsResult> {
  await requireAdminUser();

  const parsed = confirmBulkProductsSchema.safeParse(request);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados de confirmação inválidos.",
    };
  }

  const payloadHash = `sha256:${createHash("sha256")
    .update(JSON.stringify(parsed.data.items))
    .digest("hex")}`;
  const supabase = await createClient();

  try {
    const summary = await confirmBulkProductImport(
      supabase as unknown as BulkProductImportRpcClient,
      {
        idempotencyKey: parsed.data.idempotencyKey,
        payloadHash,
        items: parsed.data.items,
      },
    );

    revalidatePath("/admin/produtos");
    revalidatePath("/admin/estoque");
    revalidatePath("/catalogo");

    return {
      ok: true,
      message: "Lote cadastrado com sucesso.",
      summary,
    };
  } catch (error) {
    return {
      ok: false,
      error: translateBulkImportError(
        error instanceof Error ? error.message : "unknown_bulk_import_error",
      ),
    };
  }
}

function mapCatalogCandidates(rows: CatalogProductRow[]): CatalogProductCandidate[] {
  return rows.map((product) => {
    const normalizedName = normalizeProductIdentityFromDescription(product.name);
    const normalizedBrand = normalizeIdentity(product.brand ?? "");

    return {
      productId: product.id,
      name: product.name,
      normalizedName,
      normalizedCoreName: removeBrandFromIdentity(normalizedName, normalizedBrand),
      brand: product.brand,
      normalizedBrand,
      variants: product.product_variants.map((variant) => ({
        variantId: variant.id,
        label: variant.label,
        concentration:
          variant.concentration ?? inferConcentration(`${product.name} ${variant.label}`),
        volumeMl: variant.volume_ml,
        isKit: Boolean(variant.is_kit) || /^kits?\b/i.test(product.name),
        components: [...(variant.product_variant_kit_items ?? [])]
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((component) => ({
            type: component.component_type,
            name: component.component_name,
            volumeMl: component.volume_ml,
            quantity: component.component_quantity,
          })),
      })),
    };
  });
}

function inferConcentration(value: string): BulkProductConcentration | null {
  if (/\b(?:EDP|EAU\s+DE\s+PARFUM)\b/i.test(value)) return "EDP";
  if (/\bEDT\b/i.test(value)) return "EDT";
  if (/\bPARFUM\b/i.test(value)) return "Parfum";
  return null;
}

function resolveCategoryId(
  categorySlug: BulkProductAnalysis["categorySlug"],
  categoryBySlug: Map<string, string>,
): string | null {
  if (!categorySlug) return null;
  return categoryBySlug.get(categorySlug) ?? null;
}

function reserveUniqueSlug(baseSlug: string, usedSlugs: Set<string>): string {
  let candidate = baseSlug;
  let suffix = 2;

  while (usedSlugs.has(candidate)) {
    const suffixText = `-${suffix}`;
    candidate = `${baseSlug.slice(0, 80 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  usedSlugs.add(candidate);
  return candidate;
}
