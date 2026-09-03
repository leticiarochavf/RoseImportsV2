import type {
  BulkProductConcentration,
  KitComponent,
  ParsedBulkProduct,
} from "./parser";

export type BulkProductAnalysisStatus =
  | "new_product"
  | "existing_product"
  | "possible_duplicate"
  | "incomplete"
  | "error";

export type BulkProductProposedAction =
  | "create_inactive_product"
  | "create_inactive_variant"
  | "increment_existing_variant";

export type BulkProductAnalysisReason =
  | "duplicate_in_batch"
  | "insufficient_product_identity"
  | "shared_quantity_between_variations"
  | "similar_catalog_product"
  | "brand_missing_requires_review"
  | "category_missing"
  | "product_type_missing"
  | "gender_missing"
  | "variant_identity_incomplete";

export type CatalogVariantCandidate = {
  variantId: string;
  label: string;
  concentration: BulkProductConcentration | null;
  volumeMl: number | null;
  isKit: boolean;
  components: KitComponent[];
};

export type CatalogProductCandidate = {
  productId: string;
  name: string;
  normalizedName: string;
  normalizedCoreName: string;
  brand: string | null;
  normalizedBrand: string;
  variants: CatalogVariantCandidate[];
};

export type BulkProductDuplicateCandidate = {
  productId: string;
  productName: string;
  brand: string | null;
  variants: Array<{
    variantId: string;
    label: string;
    concentration: BulkProductConcentration | null;
    volumeMl: number | null;
  }>;
};

export type BulkProductAnalysis = ParsedBulkProduct & {
  status: BulkProductAnalysisStatus;
  proposedAction: BulkProductProposedAction | null;
  matchedProductId: string | null;
  matchedVariantId: string | null;
  requiresPriceReview: boolean;
  candidates: BulkProductDuplicateCandidate[];
  reasons: BulkProductAnalysisReason[];
};

export function analyzeBulkProductRecords(
  records: ParsedBulkProduct[],
  catalog: CatalogProductCandidate[],
): BulkProductAnalysis[] {
  return records.map((record) => analyzeRecord(record, catalog));
}

function analyzeRecord(
  record: ParsedBulkProduct,
  catalog: CatalogProductCandidate[],
): BulkProductAnalysis {
  if (record.issues.includes("shared_quantity_between_variations")) {
    return result(record, {
      status: "incomplete",
      reasons: ["shared_quantity_between_variations"],
    });
  }

  const requiredFieldReasons: BulkProductAnalysisReason[] = [];
  if (hasInsufficientProductIdentity(record)) {
    requiredFieldReasons.push("insufficient_product_identity");
  }
  if (!record.brand) requiredFieldReasons.push("brand_missing_requires_review");
  if (!record.categorySlug) requiredFieldReasons.push("category_missing");
  if (!record.productType) requiredFieldReasons.push("product_type_missing");
  if (!record.gender) requiredFieldReasons.push("gender_missing");
  if (lacksVariantIdentity(record)) {
    requiredFieldReasons.push("variant_identity_incomplete");
  }

  let missingBrandCandidates: CatalogProductCandidate[] = [];
  if (!record.brand) {
    missingBrandCandidates = catalog.filter(
      (candidate) =>
        candidate.normalizedCoreName === record.normalizedName &&
        candidate.variants.some(
          (variant) => variant.volumeMl === record.volumeMl,
        ),
    );

  }

  if (requiredFieldReasons.length > 0) {
    return result(record, {
      status: "incomplete",
      reasons: requiredFieldReasons,
      candidates: missingBrandCandidates,
    });
  }

  if (record.duplicateOfIndex !== undefined) {
    return result(record, {
      status: "possible_duplicate",
      reasons: ["duplicate_in_batch"],
    });
  }

  const normalizedBrand = normalizeIdentity(record.brand ?? "");
  const normalizedCoreName = removeBrandFromIdentity(
    record.normalizedName,
    normalizedBrand,
  );
  const sameProduct = catalog.filter(
    (candidate) =>
      candidate.normalizedCoreName === normalizedCoreName &&
      candidate.normalizedBrand === normalizedBrand,
  );

  if (sameProduct.length === 1) {
    const product = sameProduct[0];
    const exactVariants = product?.variants.filter((variant) =>
      sameVariantIdentity(record, variant),
    );

    if (exactVariants?.length === 1) {
      return result(record, {
        status: "existing_product",
        proposedAction: "increment_existing_variant",
        matchedProductId: product?.productId ?? null,
        matchedVariantId: exactVariants[0]?.variantId ?? null,
        candidates: product ? [product] : [],
      });
    }

    if ((exactVariants?.length ?? 0) > 1 || lacksVariantIdentity(record)) {
      return result(record, {
        status: "possible_duplicate",
        reasons: ["variant_identity_incomplete"],
        candidates: product ? [product] : [],
      });
    }

    return result(record, {
      status: "existing_product",
      proposedAction: "create_inactive_variant",
      matchedProductId: product?.productId ?? null,
      requiresPriceReview: true,
      candidates: product ? [product] : [],
    });
  }

  if (sameProduct.length > 1) {
    return result(record, {
      status: "possible_duplicate",
      reasons: ["similar_catalog_product"],
      candidates: sameProduct,
    });
  }

  const similar = catalog.filter(
    (candidate) =>
      candidate.normalizedBrand === normalizedBrand &&
      tokenSimilarity(candidate.normalizedCoreName, normalizedCoreName) >= 0.8,
  );

  if (similar.length > 0) {
    return result(record, {
      status: "possible_duplicate",
      reasons: ["similar_catalog_product"],
      candidates: similar,
    });
  }

  return result(record, {
    status: "new_product",
    proposedAction: "create_inactive_product",
    requiresPriceReview: true,
  });
}

type ResultOverrides = Omit<Partial<BulkProductAnalysis>, "candidates"> & {
  candidates?: CatalogProductCandidate[];
};

function result(
  record: ParsedBulkProduct,
  overrides: ResultOverrides,
): BulkProductAnalysis {
  const { candidates: candidateProducts = [], ...rest } = overrides;

  return {
    ...record,
    status: "error",
    proposedAction: null,
    matchedProductId: null,
    matchedVariantId: null,
    requiresPriceReview: false,
    candidates: candidateProducts.map((candidate) => ({
      productId: candidate.productId,
      productName: candidate.name,
      brand: candidate.brand,
      variants: candidate.variants.map((variant) => ({
        variantId: variant.variantId,
        label: variant.label,
        concentration: variant.concentration,
        volumeMl: variant.volumeMl,
      })),
    })),
    reasons: [],
    ...rest,
  };
}

function hasInsufficientProductIdentity(record: ParsedBulkProduct): boolean {
  if (!record.name) return true;

  const identity = record.normalizedName;
  const brand = normalizeIdentity(record.brand ?? "");
  const genericPatterns = [
    /^desodorantes? perfumados? arabes?(?: femininos?| masculinos?)?$/,
    /^arabes?(?: femininos?| masculinos?)?$/,
    /^(?:body splash|body mist|desodorante) armen?$/,
  ];

  return identity === brand || genericPatterns.some((pattern) => pattern.test(identity));
}

function lacksVariantIdentity(record: ParsedBulkProduct): boolean {
  if (record.isKit) return false;
  return record.volumeMl === null;
}

function sameVariantIdentity(
  record: ParsedBulkProduct,
  candidate: CatalogVariantCandidate,
): boolean {
  return (
    candidate.volumeMl === record.volumeMl &&
    candidate.concentration === record.concentration &&
    candidate.isKit === record.isKit &&
    componentSignature(candidate.components) === componentSignature(record.components)
  );
}

function componentSignature(components: KitComponent[]): string {
  return components
    .map(
      (component) =>
        `${normalizeIdentity(component.type)}:${normalizeIdentity(component.name ?? "")}:${component.volumeMl ?? ""}:${component.quantity ?? ""}`,
    )
    .join("|");
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token));
  const denominator = leftTokens.size + rightTokens.size;

  return denominator === 0 ? 0 : (2 * intersection.length) / denominator;
}

export function normalizeIdentity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function removeBrandFromIdentity(
  normalizedName: string,
  normalizedBrand: string,
): string {
  if (!normalizedBrand) return normalizedName;
  return ` ${normalizedName} `
    .replace(` ${normalizedBrand} `, " ")
    .trim()
    .replace(/\s+/g, " ");
}
