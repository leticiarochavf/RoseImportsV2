import { slugify } from "../../../lib/slug";
import { normalizeProductName } from "../../../lib/product-name";
import { buildBulkVariantLabel } from "./parser";
import type { BulkProductAnalysis } from "./dedupe";
import type { ConfirmBulkProductImportItem } from "./import-service";

export type BulkCategoryIds = {
  perfumes: string | null;
  cosmeticos: string | null;
};

export type BulkProductDecision =
  | { type: "review" }
  | { type: "skip" }
  | { type: "create_product" }
  | { type: "create_product_with_sale_data" }
  | { type: "create_variant"; productId: string }
  | { type: "increment_variant"; variantId: string };

export type EditableBulkProduct = BulkProductAnalysis & {
  categoryId: string | null;
  clientId: string;
  originalName: string;
  selected: boolean;
  reviewed: boolean;
  decision: BulkProductDecision;
  olfactoryFamilyId: string | null;
  description: string;
  featured: boolean;
  promotional: boolean;
  priceCents: number | null;
  availableForSale: boolean;
};

type AnalysisInput = BulkProductAnalysis & { categoryId: string | null };

export function createEditableItems(items: AnalysisInput[]): EditableBulkProduct[] {
  return items.map((item, index) => {
    const decision = initialDecision(item);
    const actionable = decision.type !== "review" && decision.type !== "skip";

    return {
      ...item,
      clientId: `${item.sourceLine}-${index}`,
      originalName: item.name,
      selected: actionable,
      reviewed: item.status !== "possible_duplicate" && item.status !== "incomplete",
      decision,
      olfactoryFamilyId: null,
      description: "",
      featured: false,
      promotional: false,
      priceCents: null,
      availableForSale: false,
    };
  });
}

export function duplicateEditableItem(
  item: EditableBulkProduct,
  clientId: string,
): EditableBulkProduct {
  return {
    ...item,
    clientId,
    originalName: item.name,
    selected: false,
    reviewed: false,
    decision: { type: "review" },
  };
}

export function isItemConfirmable(
  item: EditableBulkProduct,
  categoryIds: BulkCategoryIds,
): boolean {
  if (!item.selected || item.decision.type === "review" || item.decision.type === "skip") {
    return false;
  }

  if (
    !item.name.trim() ||
    !item.brand?.trim() ||
    !item.productType ||
    !item.categorySlug ||
    !item.gender ||
    (!item.isKit && item.volumeMl === null) ||
    !Number.isInteger(item.quantity) ||
    item.quantity < 1 ||
    item.quantity > 9999
  ) {
    return false;
  }

  if (
    (item.status === "possible_duplicate" ||
      item.status === "incomplete" ||
      item.status === "error") &&
    !item.reviewed
  ) {
    return false;
  }

  if (resolveCategoryId(item.categorySlug, categoryIds) === null) return false;

  if (item.decision.type === "create_product") return true;

  if (item.decision.type === "create_product_with_sale_data") {
    return (
      item.priceCents !== null &&
      Number.isInteger(item.priceCents) &&
      item.priceCents > 0 &&
      item.priceCents <= 100_000_00 &&
      item.availableForSale
    );
  }

  if (item.decision.type === "create_variant") {
    return item.decision.productId.length > 0;
  }

  return item.decision.variantId.length > 0;
}

export function buildConfirmItems(
  items: EditableBulkProduct[],
  categoryIds: BulkCategoryIds,
): ConfirmBulkProductImportItem[] {
  const selected = items.filter((item) => item.selected);

  if (selected.some((item) => !isItemConfirmable(item, categoryIds))) {
    throw new Error("unresolved_bulk_product_items");
  }

  const usedSlugs = new Set<string>();

  return selected.map((item) => {
    if (!item.brand || !item.productType || !item.categorySlug || !item.gender) {
      throw new Error("missing_bulk_product_required_fields");
    }

    const categoryId = resolveCategoryId(item.categorySlug, categoryIds);
    if (!categoryId) throw new Error("missing_bulk_product_category");

    const normalizedName = normalizeProductName(item.name);
    const requiredProductFields = {
      name: normalizedName,
      brand: item.brand.trim(),
      categoryId,
      productType: item.productType,
      gender: item.gender,
    };

    if (item.decision.type === "increment_variant") {
      return {
        action: "increment_existing_variant",
        quantity: item.quantity,
        variantId: item.decision.variantId,
        ...requiredProductFields,
      };
    }

    const variantLabel = buildBulkVariantLabel({
      volumeMl: item.volumeMl,
      isKit: item.isKit,
      isDecant: item.variantType === "decant",
    });
    const variantFields = {
      quantity: item.quantity,
      variantLabel,
      concentration: item.concentration,
      volumeMl: item.volumeMl,
      variantType: item.variantType,
      isKit: item.isKit,
      components: item.components,
    };

    const presentationFields = {
      olfactoryFamilyId: item.olfactoryFamilyId,
      description: item.description.trim() || null,
      featured: item.featured,
      promotional: item.promotional,
    };

    if (item.decision.type === "create_variant") {
      return {
        action: "create_inactive_variant",
        productId: item.decision.productId,
        ...requiredProductFields,
        ...variantFields,
      };
    }

    if (
      (item.decision.type !== "create_product" &&
        item.decision.type !== "create_product_with_sale_data") ||
      !item.productType ||
      !item.categorySlug
    ) {
      throw new Error("invalid_bulk_product_decision");
    }

    const baseSlug =
      item.name === item.originalName ? item.slug : slugify(normalizedName);
    const slug = reserveSlug(baseSlug, usedSlugs);

    if (item.decision.type === "create_product_with_sale_data") {
      if (item.priceCents === null || !item.availableForSale) {
        throw new Error("missing_bulk_product_sale_data");
      }

      return {
        action: "create_product_with_sale_data",
        ...requiredProductFields,
        ...presentationFields,
        slug,
        ...variantFields,
        priceCents: item.priceCents,
        availableForSale: true,
      };
    }

    return {
      action: "create_inactive_product",
      ...requiredProductFields,
      ...presentationFields,
      slug,
      ...variantFields,
    };
  });
}

function initialDecision(item: AnalysisInput): BulkProductDecision {
  if (
    item.proposedAction === "increment_existing_variant" &&
    item.matchedVariantId
  ) {
    return { type: "increment_variant", variantId: item.matchedVariantId };
  }

  if (
    item.proposedAction === "create_inactive_variant" &&
    item.matchedProductId
  ) {
    return { type: "create_variant", productId: item.matchedProductId };
  }

  if (item.proposedAction === "create_inactive_product") {
    return { type: "create_product" };
  }

  return { type: "review" };
}

function resolveCategoryId(
  categorySlug: NonNullable<EditableBulkProduct["categorySlug"]>,
  categoryIds: BulkCategoryIds,
): string | null {
  return categoryIds[categorySlug];
}

function reserveSlug(base: string, usedSlugs: Set<string>): string {
  let candidate = base;
  let suffix = 2;

  while (usedSlugs.has(candidate)) {
    const suffixText = `-${suffix}`;
    candidate = `${base.slice(0, 80 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  usedSlugs.add(candidate);
  return candidate;
}
