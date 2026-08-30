import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateStockStatus, stockStatus } from "@/lib/stock";
import type {
  Category,
  Gender,
  OlfactoryFamily,
  ProductType,
  StockStatusLike,
} from "@/features/catalog/types";

/* ---------------------------------------------------------------
   Formatos crus retornados pelo Supabase.

   Os tipos de src/types/database.ts descrevem tabelas isoladas; as
   consultas abaixo trazem relações aninhadas, então declaramos o
   formato esperado aqui e convertemos uma vez só.
   --------------------------------------------------------------- */

type RawVariant = {
  id: string;
  label: string;
  volume_ml: number | null;
  variant_type: "full" | "decant";
  price_cents: number;
  stock_quantity: number;
  sort_order: number;
};

type RawImage = {
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
};

type RawProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  gender: Gender | null;
  product_type: ProductType;
  description: string | null;
  promotional: boolean;
  olfactory_family_id: string | null;
  categories: { name: string; slug: string } | null;
  olfactory_families: { name: string; slug: string } | null;
  product_variants: RawVariant[];
  product_images: RawImage[];
};

const PRODUCT_SELECT = `
  id, name, slug, brand, gender, product_type, description, promotional,
  olfactory_family_id,
  categories ( name, slug ),
  olfactory_families ( name, slug ),
  product_variants ( id, label, volume_ml, variant_type, price_cents, stock_quantity, sort_order ),
  product_images ( storage_path, alt_text, sort_order )
`;

/* ---------------------------------------------------------------
   Formatos usados pela interface
   --------------------------------------------------------------- */

export type ProductCard = {
  description: ReactNode;
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  categoryName: string | null;
  gender: Gender | null;
  promotional: boolean;
  /** Menor preço entre as versões disponíveis. */
  fromPriceCents: number | null;
  stock: StockStatusLike;
  imagePath: string | null;
  imageAlt: string | null;
  variantCount: number;
};

export type ProductVariantPublic = {
  id: string;
  label: string;
  volumeMl: number | null;
  variantType: "full" | "decant";
  priceCents: number;
  stock: StockStatusLike;
  /** Teto de quantidade no carrinho. Não revela o número na interface. */
  maxQuantity: number;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  gender: Gender | null;
  productType: ProductType;
  description: string | null;
  familyName: string | null;
  images: { path: string; alt: string | null }[];
  variants: ProductVariantPublic[];
};

/* ---------------------------------------------------------------
   Conversão
   --------------------------------------------------------------- */

function sortedActiveVariants(raw: RawProduct): RawVariant[] {
  return [...raw.product_variants].sort(
    (a, b) => a.sort_order - b.sort_order || a.price_cents - b.price_cents,
  );
}

function toCard(raw: RawProduct): ProductCard {
  const variants = sortedActiveVariants(raw);
  const inStock = variants.filter((v) => v.stock_quantity > 0);

  // O "a partir de" considera só o que dá para comprar hoje.
  const pricePool = inStock.length > 0 ? inStock : variants;
  const fromPriceCents =
    pricePool.length > 0
      ? Math.min(...pricePool.map((v) => v.price_cents))
      : null;

  const images = [...raw.product_images].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const cover = images[0] ?? null;

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    brand: raw.brand,
    categoryName: raw.categories?.name ?? null,
    gender: raw.gender,
    promotional: raw.promotional,
    fromPriceCents,
    stock: aggregateStockStatus(variants.map((v) => v.stock_quantity)),
    imagePath: cover?.storage_path ?? null,
    imageAlt: cover?.alt_text ?? null,
    variantCount: variants.length,
  };
}

function toDetail(raw: RawProduct): ProductDetail {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    brand: raw.brand,
    categoryName: raw.categories?.name ?? null,
    categorySlug: raw.categories?.slug ?? null,
    gender: raw.gender,
    productType: raw.product_type,
    description: raw.description,
    familyName: raw.olfactory_families?.name ?? null,
    images: [...raw.product_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ path: i.storage_path, alt: i.alt_text })),
    variants: sortedActiveVariants(raw).map((v) => ({
      id: v.id,
      label: v.label,
      volumeMl: v.volume_ml,
      variantType: v.variant_type,
      priceCents: v.price_cents,
      stock: stockStatus(v.stock_quantity),
      maxQuantity: v.stock_quantity,
    })),
  };
}

/* ---------------------------------------------------------------
   Consultas
   --------------------------------------------------------------- */

export type CatalogFilters = {
  q?: string;
  categoria?: string;
  genero?: string;
  familia?: string;
};

export async function getCatalogProducts(
  filters: CatalogFilters,
): Promise<ProductCard[]> {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .order("name");

  if (filters.q?.trim()) {
    const term = filters.q.trim();
    // ilike é case-insensitive; cobre nome e marca. (§45)
    query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
  }

  if (filters.genero === "feminino" || filters.genero === "masculino") {
    query = query.in("gender", [filters.genero, "unissex"]);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as unknown as RawProduct[];

  // Categoria e família vêm por slug da relação: filtramos em memória
  // porque o volume do catálogo é pequeno e evita join extra.
  if (filters.categoria) {
    rows = rows.filter((r) => r.categories?.slug === filters.categoria);
  }
  if (filters.familia) {
    rows = rows.filter((r) => r.olfactory_families?.slug === filters.familia);
  }

  // Produto sem nenhuma versão ativa não tem o que vender.
  return rows.filter((r) => r.product_variants.length > 0).map(toCard);
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("featured", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawProduct[])
    .filter((r) => r.product_variants.length > 0)
    .map(toCard);
}

/** Perfumes em destaque têm seção própria na Home. (§7) */
export async function getFeaturedPerfumes(limit = 8): Promise<ProductCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("featured", true)
    .in("product_type", ["perfume", "body_splash"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawProduct[])
    .filter((r) => r.product_variants.length > 0)
    .map(toCard);
}

export async function getBestSellingProducts(limit = 8): Promise<ProductCard[]> {
  try {
    const admin = createAdminClient();
    const { data: paidOrders } = await admin
      .from("orders")
      .select("id")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(250);

    const orderIds = (paidOrders ?? []).map((order) => order.id);
    if (orderIds.length === 0) return [];

    const { data: items } = await admin
      .from("order_items")
      .select("product_id, quantity")
      .in("order_id", orderIds);

    const totals = new Map<string, number>();
    for (const item of items ?? []) {
      if (!item.product_id) continue;
      totals.set(item.product_id, (totals.get(item.product_id) ?? 0) + item.quantity);
    }

    const rankedIds = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (rankedIds.length === 0) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("active", true)
      .in("id", rankedIds);

    if (error) throw new Error(error.message);

    const byId = new Map(
      ((data ?? []) as unknown as RawProduct[])
        .filter((row) => row.product_variants.length > 0)
        .map((row) => [row.id, toCard(row)] as const),
    );

    return rankedIds
      .map((id) => byId.get(id))
      .filter((product): product is ProductCard => Boolean(product));
  } catch {
    // Em ambientes sem service role (ex.: preview), a Home continua funcionando.
    return [];
  }
}

export async function getNewProducts(limit = 8): Promise<ProductCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawProduct[])
    .filter((r) => r.product_variants.length > 0)
    .map(toCard);
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return toDetail(data as unknown as RawProduct);
}

export async function getProductSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("active", true);
  return (data ?? []).map((r) => r.slug);
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("active", true)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function getOlfactoryFamilies(): Promise<OlfactoryFamily[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("olfactory_families")
    .select("id, name, slug")
    .eq("active", true)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []) as OlfactoryFamily[];
}
