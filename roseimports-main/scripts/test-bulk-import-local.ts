import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import {
  analyzeBulkProductRecords,
  normalizeIdentity,
  removeBrandFromIdentity,
  type CatalogProductCandidate,
} from "../src/features/admin/bulk-products/dedupe";
import {
  confirmBulkProductImport,
  type BulkProductImportRpcClient,
  type ConfirmBulkProductImportItem,
} from "../src/features/admin/bulk-products/import-service";
import { parseBulkProducts } from "../src/features/admin/bulk-products/parser";
import type { Database } from "../src/types/database";

const localUrl =
  process.env.SUPABASE_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.SUPABASE_ANON_KEY ??
  process.env.ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;

if (!localUrl || !anonKey || !serviceKey) {
  throw new Error(
    "Carregue API_URL, ANON_KEY e SERVICE_ROLE_KEY com `npx supabase status -o env`.",
  );
}

const parsedUrl = new URL(localUrl);
const isLocal = ["127.0.0.1", "localhost"].includes(parsedUrl.hostname);
if (!isLocal) {
  throw new Error(
    `Recusado: host ${parsedUrl.hostname} não é um Supabase local.`,
  );
}

const admin = createClient<Database>(localUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `bulk-local-${randomUUID()}@rose.invalid`;
const password = `Local-${randomUUID()}-Aa1!`;

const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
assert.ifError(createUserError);
assert(createdUser.user, "Usuário local não foi criado.");

const { error: profileError } = await admin.from("profiles").insert({
  id: createdUser.user.id,
  full_name: "Teste local de cadastro em lote",
  created_at: new Date().toISOString(),
});
assert.ifError(profileError);

const authenticated = createClient<Database>(localUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: signInError } = await authenticated.auth.signInWithPassword({
  email,
  password,
});
assert.ifError(signInError);

const { data: categories, error: categoryError } = await admin
  .from("categories")
  .select("id, slug")
  .in("slug", ["perfumes", "cosmeticos"]);
assert.ifError(categoryError);
const categoryBySlug = new Map((categories ?? []).map((row) => [row.slug, row.id]));
const perfumeCategoryId = categoryBySlug.get("perfumes");
assert(perfumeCategoryId, "Categoria local de perfumes não encontrada.");

const existingProductId = randomUUID();
const existingVariantId = randomUUID();
const { error: seedProductError } = await admin.from("products").insert({
  id: existingProductId,
  name: "Lattafa Jasoor",
  slug: `lattafa-jasoor-local-${randomUUID()}`,
  brand: "Lattafa",
  category_id: perfumeCategoryId,
  product_type: "perfume",
  gender: null,
  olfactory_family_id: null,
  description: null,
  active: true,
  featured: false,
  promotional: false,
  showcase_order: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
assert.ifError(seedProductError);

const { error: seedVariantError } = await admin.from("product_variants").insert({
  id: existingVariantId,
  product_id: existingProductId,
  label: "100 ml",
  volume_ml: 100,
  variant_type: "full",
  price_cents: 10000,
  stock_quantity: 5,
  active: true,
  sort_order: 0,
  concentration: null,
  is_kit: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
assert.ifError(seedVariantError);

const fixture = await readFile(
  resolve(process.cwd(), "scripts/fixtures/whatsapp-stock-list.txt"),
  "utf8",
);
const parsed = parseBulkProducts(fixture);
assert.equal(parsed.length, 94, "A lista local precisa produzir 94 registros.");
assert.equal(
  parsed.reduce((total, item) => total + item.quantity, 0),
  414,
  "A lista local precisa somar 414 unidades.",
);

const normalizedName = normalizeIdentity("Lattafa Jasoor");
const normalizedBrand = normalizeIdentity("Lattafa");
const catalog: CatalogProductCandidate[] = [
  {
    productId: existingProductId,
    name: "Lattafa Jasoor",
    normalizedName,
    normalizedCoreName: removeBrandFromIdentity(normalizedName, normalizedBrand),
    brand: "Lattafa",
    normalizedBrand,
    productType: "perfume",
    variants: [
      {
        variantId: existingVariantId,
        label: "100 ml",
        concentration: null,
        volumeMl: 100,
        variantType: "full",
        isKit: false,
        components: [],
      },
    ],
  },
];
const analyses = analyzeBulkProductRecords(parsed, catalog);
const sharedQuantityNames = analyses
  .filter((item) => item.reasons.includes("shared_quantity_between_variations"))
  .map((item) => item.name);
assert.deepEqual(sharedQuantityNames, [
  "Delilah Blanc/Delilah Pour Femme",
  "Eclaire Pistache/Eclaire Banoffi Lattafa",
  "Vulcan Baie/Vulcan Feu/Vulcan Sable",
  "Yara Perfumes Lattafa",
]);
assert(
  analyses
    .filter((item) => !item.brand)
    .every((item) => ["possible_duplicate", "incomplete"].includes(item.status)),
  "Linhas sem marca não podem virar correspondência automática.",
);
assert(
  analyses.every((item) => item.categorySlug !== null),
  "A lista real deve ter categoria determinada por seus cabeçalhos.",
);
const statusCounts = analyses.reduce<Record<string, number>>((counts, item) => {
  counts[item.status] = (counts[item.status] ?? 0) + 1;
  return counts;
}, {});

const usedSlugs = new Set<string>();
const items: ConfirmBulkProductImportItem[] = [];
const runSlugSuffix = randomUUID().slice(0, 8);

for (const analysis of analyses) {
  if (
    !analysis.brand ||
    !analysis.gender ||
    !analysis.productType ||
    !analysis.categorySlug
  ) {
    continue;
  }

  const categoryId = categoryBySlug.get(analysis.categorySlug);
  assert(categoryId, `Categoria ausente para ${analysis.name}.`);
  const requiredProductFields = {
    name: analysis.name,
    brand: analysis.brand,
    categoryId,
    productType: analysis.productType,
    gender: analysis.gender,
  };

  if (analysis.proposedAction === "increment_existing_variant") {
    assert(analysis.matchedVariantId);
    items.push({
      action: "increment_existing_variant",
      quantity: analysis.quantity,
      variantId: analysis.matchedVariantId,
      ...requiredProductFields,
    });
    continue;
  }

  if (analysis.proposedAction !== "create_inactive_product") {
    continue;
  }

  const suffixText = `-test-${runSlugSuffix}`;
  let slug = `${analysis.slug.slice(0, 80 - suffixText.length)}${suffixText}`;
  let suffix = 2;
  while (usedSlugs.has(slug)) {
    const duplicateSuffix = `${suffixText}-${suffix}`;
    slug = `${analysis.slug.slice(0, 80 - duplicateSuffix.length)}${duplicateSuffix}`;
    suffix += 1;
  }
  usedSlugs.add(slug);

  items.push({
    action: "create_inactive_product",
    quantity: analysis.quantity,
    ...requiredProductFields,
    olfactoryFamilyId: null,
    description: null,
    featured: false,
    promotional: false,
    slug,
    variantLabel: analysis.variantLabel,
    concentration: analysis.concentration,
    volumeMl: analysis.volumeMl,
    variantType: analysis.variantType,
    isKit: analysis.isKit,
    components: analysis.components,
  });
}

assert(items.length > 0, "Nenhum item seguro foi selecionado para confirmação local.");
const rpcClient = authenticated as unknown as BulkProductImportRpcClient;
const idempotencyKey = randomUUID();
const payloadHash = hashItems(items);
const beforeProductCount = await countProducts(admin);
const first = await confirmBulkProductImport(rpcClient, {
  idempotencyKey,
  payloadHash,
  items,
});
assert.equal(first.unitsAdded, items.reduce((sum, item) => sum + item.quantity, 0));

const afterFirstProductCount = await countProducts(admin);
const stockAfterFirst = await readStock(admin, existingVariantId);
const repeated = await confirmBulkProductImport(rpcClient, {
  idempotencyKey,
  payloadHash,
  items,
});
assert.deepEqual(repeated, first, "Repetição precisa devolver o mesmo resumo.");
assert.equal(await countProducts(admin), afterFirstProductCount);
assert.equal(await readStock(admin, existingVariantId), stockAfterFirst);

const changedItems = items.map((item, index) =>
  index === 0 ? { ...item, quantity: item.quantity + 1 } : item,
);
await assert.rejects(
  confirmBulkProductImport(rpcClient, {
    idempotencyKey,
    payloadHash: hashItems(changedItems),
    items: changedItems,
  }),
  /idempotency_key_reused_with_different_payload/,
);

const duplicateSlug = items.find(
  (item): item is Extract<ConfirmBulkProductImportItem, { action: "create_inactive_product" }> =>
    item.action === "create_inactive_product",
)?.slug;
assert(duplicateSlug);
const rollbackKey = randomUUID();
const rollbackItems: ConfirmBulkProductImportItem[] = [
  {
    action: "increment_existing_variant",
    quantity: 3,
    variantId: existingVariantId,
    name: "Produto existente de teste",
    brand: "Marca de teste",
    categoryId: perfumeCategoryId,
    productType: "perfume",
    gender: "unissex",
  },
  {
    action: "create_inactive_product",
    quantity: 1,
    name: "Produto que deve sofrer rollback",
    slug: duplicateSlug,
    brand: "Marca de teste",
    categoryId: perfumeCategoryId,
    productType: "perfume",
    gender: "unissex",
    olfactoryFamilyId: null,
    description: null,
    featured: false,
    promotional: false,
    variantLabel: "100 ml",
    concentration: null,
    volumeMl: 100,
    variantType: "full",
    isKit: false,
    components: [],
  },
];
await assert.rejects(
  confirmBulkProductImport(rpcClient, {
    idempotencyKey: rollbackKey,
    payloadHash: hashItems(rollbackItems),
    items: rollbackItems,
  }),
);
assert.equal(await readStock(admin, existingVariantId), stockAfterFirst);
assert.equal(await countProducts(admin), afterFirstProductCount);
const { count: failedAuditCount, error: failedAuditError } = await admin
  .from("bulk_product_imports")
  .select("id", { count: "exact", head: true })
  .eq("idempotency_key", rollbackKey);
assert.ifError(failedAuditError);
assert.equal(failedAuditCount, 0, "Falha não pode gravar auditoria parcial.");

console.log(
  JSON.stringify(
    {
      parsedRecords: parsed.length,
      parsedUnits: parsed.reduce((total, item) => total + item.quantity, 0),
      statusCounts,
      categoryCounts: analyses.reduce<Record<string, number>>((counts, item) => {
        const category = item.categorySlug ?? "unmapped";
        counts[category] = (counts[category] ?? 0) + 1;
        return counts;
      }, {}),
      sharedQuantityNames,
      brandMissingForManualReview: analyses.filter(
        (item) => !item.brand,
      ).length,
      confirmedItems: items.length,
      skippedForReview: analyses.length - items.length,
      productsBefore: beforeProductCount,
      productsAfter: afterFirstProductCount,
      summary: first,
      idempotencyRepeated: true,
      differentPayloadRejected: true,
      rollbackVerified: true,
    },
    null,
    2,
  ),
);

function hashItems(value: ConfirmBulkProductImportItem[]): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

async function countProducts(client: typeof admin): Promise<number> {
  const { count, error } = await client
    .from("products")
    .select("id", { count: "exact", head: true });
  assert.ifError(error);
  return count ?? 0;
}

async function readStock(client: typeof admin, variantId: string): Promise<number> {
  const { data, error } = await client
    .from("product_variants")
    .select("stock_quantity")
    .eq("id", variantId)
    .single();
  assert.ifError(error);
  return data.stock_quantity;
}
