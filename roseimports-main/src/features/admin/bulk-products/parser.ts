import { slugify } from "../../../lib/slug";
import { normalizeProductName } from "../../../lib/product-name";
import { categorySlugForProductType } from "../../../lib/product-category";

export type BulkProductType = "perfume" | "body_splash" | "cosmetico";

export type BulkProductCategorySlug = "perfumes" | "cosmeticos";

export type BulkProductConcentration = "EDP" | "EDT" | "Parfum";

export type BulkProductGender = "feminino" | "masculino" | "unissex";

export type BulkProductIssue = "shared_quantity_between_variations";

export type KitComponent = {
  type: string;
  name: string | null;
  volumeMl: number | null;
  quantity: number | null;
};

export type ParsedBulkProduct = {
  source: string;
  sourceLine: number;
  name: string;
  brand: string | null;
  line: string | null;
  concentration: BulkProductConcentration | null;
  gender: BulkProductGender | null;
  productType: BulkProductType | null;
  categorySlug: BulkProductCategorySlug | null;
  variantType: "full" | "decant";
  variantLabel: string;
  volumeMl: number | null;
  quantity: number;
  isKit: boolean;
  components: KitComponent[];
  variations: string[];
  normalizedName: string;
  slug: string;
  issues: BulkProductIssue[];
  duplicateOfIndex?: number;
};

type Section = "body_splash" | "cosmetico" | "kit" | "perfume";

const BRANDS = [
  "Victoria's Secret",
  "Carolina Herrera",
  "Maison Alhambra",
  "Aurora Scents",
  "French Avenue",
  "Al Wataniah",
  "Al Haramain",
  "V.V. Love",
  "Al Absar",
  "Lattafa",
  "Armaf",
  "Mugler",
  "Rasasi",
  "Onlyou",
  "Assala",
] as const;

const SECTION_BY_HEADING: Record<string, Section> = {
  "body splash body mist e desodorantes": "body_splash",
  "cremes corporais": "cosmetico",
  kits: "kit",
  perfumes: "perfume",
  "miniaturas onlyou": "perfume",
};

const IGNORED_DOCUMENT_HEADINGS = new Set([
  "produtos",
  "produtos adicionados",
  "relacao para emissao da nota fiscal",
]);

const COMPONENT_PATTERN =
  /\b(?:perfumes?|spray(?:\s+corporal)?|lo[cç][aã]o\s+corporal|body\s+lotion|miniaturas?|edp|edt|eau\s+de\s+parfum|parfum)\b/i;

/**
 * Converte texto colado do WhatsApp ou uma lista numerada em registros de
 * prévia. O parser não consulta nem altera o catálogo.
 */
export function parseBulkProducts(input: string): ParsedBulkProduct[] {
  const records: ParsedBulkProduct[] = [];
  const groupedVariationCandidates: boolean[] = [];
  let currentSection: Section | null = null;

  const lines = input.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const source = collapseWhitespace(lines[lineIndex] ?? "");

    if (!source) continue;

    const normalizedLine = normalizeForComparison(source);
    const section = SECTION_BY_HEADING[normalizedLine];

    if (section) {
      currentSection = section;
      continue;
    }

    if (/^quantidade\s+total\s*:/i.test(source)) {
      const lastIndex = records.length - 1;

      if (lastIndex >= 0 && groupedVariationCandidates[lastIndex]) {
        markSharedQuantity(records[lastIndex]);
      }

      continue;
    }

    if (/^quantidade\s*:/i.test(source)) {
      const quantity = readQuantity(source);
      const last = records.at(-1);

      if (last && quantity !== null) last.quantity = quantity;
      continue;
    }

    if (/^varia[cç][oõ]es\s*:/i.test(source)) {
      const variationGroup = parseVariationGroup(source);
      const last = records.at(-1);

      if (last) {
        last.variations = variationGroup.variations;
        if (variationGroup.quantity !== null) {
          last.quantity = variationGroup.quantity;
        }
        markSharedQuantity(last);
        groupedVariationCandidates[records.length - 1] = true;
      } else if (variationGroup.variations.length > 0) {
        const name = variationGroup.variations.join(" / ");

        records.push(
          buildRecord({
            source,
            sourceLine: lineIndex + 1,
            description: name,
            quantity: variationGroup.quantity ?? 1,
            section: currentSection,
            forcedVariations: variationGroup.variations,
            forcedIssue: "shared_quantity_between_variations",
          }),
        );
        groupedVariationCandidates.push(true);
      }

      continue;
    }

    if (IGNORED_DOCUMENT_HEADINGS.has(normalizedLine) || isSeparator(source)) {
      continue;
    }

    const numbered = source.match(/^\d+\.\s*(.+)$/);
    let description = numbered?.[1] ?? source;
    let quantity = 1;

    if (!numbered) {
      const prefixedQuantity = description.match(/^(\d+)\s+(.+)$/);

      if (
        prefixedQuantity &&
        (currentSection !== null || isMostlyUppercase(prefixedQuantity[2] ?? ""))
      ) {
        quantity = Number(prefixedQuantity[1]);
        description = prefixedQuantity[2] ?? "";
      }
    }

    const inlineMetadata = readInlineMetadata(description);
    description = inlineMetadata.description;
    quantity = inlineMetadata.quantity ?? quantity;

    const record = buildRecord({
      source,
      sourceLine: lineIndex + 1,
      description,
      quantity,
      section: currentSection,
      forcedVariations: inlineMetadata.variations,
      forcedIssue: inlineMetadata.sharedQuantity
        ? "shared_quantity_between_variations"
        : undefined,
    });

    records.push(record);
    groupedVariationCandidates.push(record.variations.length > 1);
  }

  markDuplicates(records);
  return records;
}

function readInlineMetadata(value: string): {
  description: string;
  quantity: number | null;
  variations: string[];
  sharedQuantity: boolean;
} {
  let description = value;
  let quantity: number | null = null;
  let sharedQuantity = false;

  const quantityMatch = description.match(
    /\s+quantidade\s*(?:(total)\s*)?:\s*(\d+)(?:\s+(?:unidades?|kits?))?(?:,.*)?$/i,
  );

  if (quantityMatch?.index !== undefined) {
    description = description.slice(0, quantityMatch.index);
    quantity = Number(quantityMatch[2]);
    sharedQuantity = Boolean(quantityMatch[1]);
  }

  const variationsMatch = description.match(/\s+varia[cç][oõ]es\s*:\s*(.+)$/i);
  let variations: string[] = [];

  if (variationsMatch?.index !== undefined) {
    description = description.slice(0, variationsMatch.index);
    variations = parseVariationList(variationsMatch[1] ?? "");
    sharedQuantity = true;
  }

  if (sharedQuantity && !description.includes("/") && variations.length === 0) {
    sharedQuantity = false;
  }

  return {
    description: collapseWhitespace(description),
    quantity,
    variations,
    sharedQuantity,
  };
}

/** Normalização compartilhada com a comparação do catálogo existente. */
export function normalizeProductIdentityFromDescription(value: string): string {
  const name = /^(?:kit|kits)\b/i.test(value)
    ? readKitName(value)
    : readProductName(value);

  return normalizeForComparison(name);
}

function buildRecord({
  source,
  sourceLine,
  description,
  quantity,
  section,
  forcedVariations = [],
  forcedIssue,
}: {
  source: string;
  sourceLine: number;
  description: string;
  quantity: number;
  section: Section | null;
  forcedVariations?: string[];
  forcedIssue?: BulkProductIssue;
}): ParsedBulkProduct {
  const cleanDescription = collapseWhitespace(description);
  const isKit = /^(?:kit|kits)\b/i.test(cleanDescription) || section === "kit";
  const concentration = readConcentration(cleanDescription);
  const components = isKit ? readKitComponents(cleanDescription) : [];
  const volumeMl = isKit ? null : readFirstVolume(cleanDescription);
  const rawName = isKit
    ? readKitName(cleanDescription)
    : readProductName(cleanDescription);
  const name = normalizeProductName(rawName);
  const brand = readBrand(name);
  const line = readLine(name, brand, isKit);
  const gender = readGender(cleanDescription);
  const variations =
    forcedVariations.length > 0 ? forcedVariations : readSlashVariations(rawName);
  const issues = forcedIssue ? [forcedIssue] : [];
  if (
    variations.length > 1 &&
    !issues.includes("shared_quantity_between_variations")
  ) {
    issues.push("shared_quantity_between_variations");
  }
  const productType = readProductType(cleanDescription, section, concentration, isKit);

  return {
    source,
    sourceLine,
    name,
    brand,
    line,
    concentration,
    gender,
    productType,
    categorySlug: categorySlugForProductType(productType),
    variantType: /\bdecant\b/i.test(cleanDescription) ? "decant" : "full",
    variantLabel: buildBulkVariantLabel({
      volumeMl,
      isKit,
      isDecant: /\bdecant\b/i.test(cleanDescription),
    }),
    volumeMl,
    quantity,
    isKit,
    components,
    variations,
    normalizedName: normalizeForComparison(name),
    slug: slugify(name),
    issues,
  };
}

export function buildBulkVariantLabel({
  volumeMl,
  isKit,
  isDecant,
}: {
  volumeMl: number | null;
  isKit: boolean;
  isDecant: boolean;
}): string {
  if (isKit) return "Kit";
  if (volumeMl === null) return "";
  return isDecant ? `${volumeMl} ml decant` : `${volumeMl} ml`;
}

function readKitName(description: string): string {
  let normalized = description.replace(/^kits\b/i, "Kit");
  const commaIndex = normalized.indexOf(",");

  if (commaIndex >= 0) {
    const afterComma = normalized.slice(commaIndex + 1);

    if (COMPONENT_PATTERN.test(afterComma) && /\d+\s*ml\b/i.test(afterComma)) {
      normalized = normalized.slice(0, commaIndex);
    }
  }

  if (normalized.includes("+")) {
    const componentStart = normalized.search(
      /\b(?:\d+\s+)?(?:perfumes?|spray(?:\s+corporal)?|lo[cç][aã]o\s+corporal|body\s+lotion|edp|edt|eau\s+de\s+parfum|parfum)\b(?=[^+]*\d+\s*ml)/i,
    );

    if (componentStart > 0) normalized = normalized.slice(0, componentStart);
  }

  normalized = normalized.replace(/^kits\b/i, "Kit");
  return cleanName(normalized);
}

function readProductName(description: string): string {
  return cleanName(
    description
      .replace(/\bperfuming\s+body\s+lotion\b/gi, " ")
      .replace(/\bbody\s+(?:splash|mist|cream)\b/gi, " ")
      .replace(
        /,?\s*\bminiatura\b\s*,(?=\s*(?:eau\s+de\s+parfum|edp|edt|parfum))/gi,
        " ",
      )
      .replace(/\b(?:eau\s+de\s+parfum|edp|edt|parfum)\b/gi, " ")
      .replace(
        /,?\s*\b(?:miniatura|decant)?\s*(?:de\s*)?\d+\s*ml\b/gi,
        " ",
      )
      .replace(/,\s*(?:masculino|feminino|unissex)\b/gi, " "),
  );
}

function cleanName(value: string): string {
  return collapseWhitespace(value)
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",")
    .replace(/(?:,|\+)\s*$/g, "")
    .trim();
}

function readKitComponents(description: string): KitComponent[] {
  let componentText = "";
  const commaIndex = description.indexOf(",");

  if (commaIndex >= 0) {
    const afterComma = description.slice(commaIndex + 1);
    if (COMPONENT_PATTERN.test(afterComma)) componentText = afterComma;
  }

  if (!componentText && description.includes("+")) {
    const componentStart = description.search(
      /\b(?:\d+\s+)?(?:perfumes?|spray(?:\s+corporal)?|lo[cç][aã]o\s+corporal|body\s+lotion|edp|edt|eau\s+de\s+parfum|parfum)\b(?=[^+]*\d+\s*ml)/i,
    );

    if (componentStart >= 0) componentText = description.slice(componentStart);
  }

  if (!componentText || !/\d+\s*ml\b/i.test(componentText)) return [];

  return componentText
    .split("+")
    .map((part) => collapseWhitespace(part))
    .filter((part) => COMPONENT_PATTERN.test(part))
    .map((part) => {
      const explicitQuantity = part.match(/^(\d+)\s+/);
      const pluralWithoutQuantity =
        !explicitQuantity && /\b(?:perfumes|miniaturas)\b/i.test(part);

      return {
        type: readComponentType(part),
        name: readComponentName(part),
        volumeMl: readFirstVolume(part),
        quantity: explicitQuantity
          ? Number(explicitQuantity[1])
          : pluralWithoutQuantity
            ? null
            : 1,
      };
    });
}

function readComponentName(part: string): string | null {
  const name = cleanName(
    part
      .replace(/^\d+\s+/, "")
      .replace(
        /\b(?:perfumes?|spray(?:\s+corporal)?|lo[cç][aã]o\s+corporal|body\s+lotion|miniaturas?|edp|edt|eau\s+de\s+parfum|parfum)\b/gi,
        " ",
      )
      .replace(/\b(?:de\s*)?\d+\s*ml\b/gi, " "),
  );

  return name || null;
}

function readComponentType(part: string): string {
  if (/spray\s+corporal/i.test(part)) return "spray corporal";
  if (/\bspray\b/i.test(part)) return "spray";
  if (/lo[cç][aã]o\s+corporal/i.test(part)) return "loção corporal";
  if (/body\s+lotion/i.test(part)) return "body lotion";
  if (/miniaturas?/i.test(part)) return "miniatura";
  return "perfume";
}

function readConcentration(value: string): BulkProductConcentration | null {
  if (/\b(?:edp|eau\s+de\s+parfum)\b/i.test(value)) return "EDP";
  if (/\bedt\b/i.test(value)) return "EDT";
  if (/\bparfum\b/i.test(value)) return "Parfum";
  return null;
}

function readGender(value: string): BulkProductGender | null {
  if (/\bunissex\b/i.test(value)) return "unissex";

  const feminine = /\b(?:feminin[ao]s?|woman|women|for\s+her)\b/i.test(value);
  const masculine = /\b(?:masculin[ao]s?|man|men|for\s+him)\b/i.test(value);

  if (feminine === masculine) return null;
  return feminine ? "feminino" : "masculino";
}

function readFirstVolume(value: string): number | null {
  const match = value.match(/\b(\d+)\s*ml\b/i);
  return match ? Number(match[1]) : null;
}

function readProductType(
  description: string,
  section: Section | null,
  concentration: BulkProductConcentration | null,
  isKit: boolean,
): BulkProductType | null {
  if (/\bbody\s+(?:splash|mist)\b/i.test(description)) return "body_splash";
  if (/\bdesodorantes?\s+perfumados?\b/i.test(description)) {
    return "body_splash";
  }
  if (/\b(?:body\s+cream|body\s+lotion|lo[cç][aã]o\s+corporal)\b/i.test(description)) {
    return "cosmetico";
  }
  if (section === "body_splash" || section === "cosmetico") return section;
  if (
    section === "perfume" ||
    section === "kit" ||
    isKit ||
    concentration ||
    /\b(?:perfume|decant|miniatura)\b/i.test(description)
  ) {
    return "perfume";
  }
  return null;
}

function readBrand(name: string): string | null {
  const normalizedName = ` ${normalizeForComparison(name)} `;

  return (
    BRANDS.find((brand) =>
      normalizedName.includes(` ${normalizeForComparison(brand)} `),
    ) ?? null
  );
}

function readLine(name: string, brand: string | null, isKit: boolean): string | null {
  let value = name.replace(/^kit\s+/i, "");

  if (brand) {
    const brandPattern = new RegExp(escapeRegExp(brand), "i");
    value = value.replace(brandPattern, "");
  }

  value = collapseWhitespace(value).replace(/^[-,\s]+|[-,\s]+$/g, "");
  return value || (isKit ? null : name);
}

function readSlashVariations(name: string): string[] {
  if (!name.includes("/")) return [];
  return name.split("/").map((variation) => collapseWhitespace(variation));
}

function parseVariationGroup(source: string): {
  variations: string[];
  quantity: number | null;
} {
  const content = source
    .replace(/^varia[cç][oõ]es\s*:\s*/i, "")
    .split(/\s+[—–-]\s+quantidade\s+total\s*:/i)[0]
    ?.trim() ?? "";
  const quantityMatch = source.match(/quantidade\s+total\s*:\s*(\d+)/i);
  const variations = parseVariationList(content);

  return {
    variations,
    quantity: quantityMatch ? Number(quantityMatch[1]) : null,
  };
}

function parseVariationList(value: string): string[] {
  return value
    .replace(/\s+e\s+([^,]+)$/i, ", $1")
    .split(",")
    .map((variation) => collapseWhitespace(variation))
    .filter(Boolean);
}

function readQuantity(value: string): number | null {
  const match = value.match(/:\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function markSharedQuantity(record: ParsedBulkProduct | undefined): void {
  if (!record) return;
  if (!record.issues.includes("shared_quantity_between_variations")) {
    record.issues.push("shared_quantity_between_variations");
  }
}

function markDuplicates(records: ParsedBulkProduct[]): void {
  const firstIndexByKey = new Map<string, number>();

  records.forEach((record, index) => {
    const componentKey = record.components
      .map(
        (component) =>
          `${normalizeForComparison(component.type)}:${normalizeForComparison(component.name ?? "")}:${component.volumeMl ?? ""}:${component.quantity ?? ""}`,
      )
      .join("|");
    const key = [
      record.normalizedName,
      normalizeForComparison(record.brand ?? ""),
      record.productType ?? "",
      record.concentration ?? "",
      record.volumeMl ?? "",
      record.variantType,
      record.isKit ? "kit" : "product",
      componentKey,
    ].join("::");
    const duplicateOfIndex = firstIndexByKey.get(key);

    if (duplicateOfIndex === undefined) {
      firstIndexByKey.set(key, index);
    } else {
      record.duplicateOfIndex = duplicateOfIndex;
    }
  });
}

function isSeparator(value: string): boolean {
  return /^[-_=*.]{3,}$/.test(value.replace(/\s/g, ""));
}

function isMostlyUppercase(value: string): boolean {
  const letters = value.replace(/[^\p{L}]/gu, "");
  if (!letters) return false;
  const uppercase = [...letters].filter(
    (letter) => letter === letter.toLocaleUpperCase("pt-BR"),
  ).length;
  return uppercase / [...letters].length >= 0.8;
}

function normalizeForComparison(value: string): string {
  return collapseWhitespace(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " "),
  );
}

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
