import { createClient } from "@/lib/supabase/server";
import { searchOrFilters } from "@/lib/search";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateStockStatus, stockStatus } from "@/lib/stock";
import type { CatalogSort } from "@/features/catalog/sorting";
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
  price_cents: number | null;
  stock_quantity: number;
  sort_order: number;
  active: boolean;
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
  showcase_order: number | null;
  categories: { name: string; slug: string } | null;
  olfactory_families: { name: string; slug: string } | null;
  product_variants: RawVariant[];
  product_images: RawImage[];
};

const PRODUCT_SELECT = `
  id, name, slug, brand, gender, product_type, description, promotional,
  olfactory_family_id, showcase_order,
  categories ( name, slug ),
  olfactory_families ( name, slug ),
  product_variants ( id, label, volume_ml, variant_type, price_cents, stock_quantity, sort_order, active ),
  product_images ( storage_path, alt_text, sort_order )
`;

/* ---------------------------------------------------------------
   Formatos usados pela interface
   --------------------------------------------------------------- */

export type ProductCard = {
  description: string | null;
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
  images: { path: string; alt: string | null }[];
  variantCount: number;
  /** Posição na vitrine definida no painel; nulo vai para o fim. */
  showcaseOrder: number | null;
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

function sortedActiveVariants(
  raw: RawProduct,
): Array<RawVariant & { price_cents: number }> {
  return raw.product_variants
    .filter(
      (variant): variant is RawVariant & { price_cents: number } =>
        variant.active && variant.price_cents !== null,
    )
    .sort(
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
    description: raw.description,
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
    images: images.map((image) => ({
      path: image.storage_path,
      alt: image.alt_text,
    })),
    variantCount: variants.length,
    showcaseOrder: raw.showcase_order ?? null,
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
  /** Faixa de preço em centavos, como todo valor monetário do projeto. */
  precoMin?: number | null;
  precoMax?: number | null;
};

/**
 * Preço de referência do produto: o menor entre as versões ativas, que é
 * o mesmo `fromPriceCents` exibido no card. Vitrine, filtro e ordenação
 * usam este número — admin e loja não podem discordar sobre qual produto
 * é o mais barato.
 */
function matchesPriceRange(
  priceCents: number | null,
  min?: number | null,
  max?: number | null,
) {
  if (min == null && max == null) return true;
  // Sem preço não há como afirmar que cabe na faixa pedida.
  if (priceCents == null) return false;
  if (min != null && priceCents < min) return false;
  if (max != null && priceCents > max) return false;
  return true;
}

function byName(a: ProductCard, b: ProductCard) {
  return a.name.localeCompare(b.name, "pt-BR");
}

/**
 * Produto sem preço válido vai sempre para o fim das ordenações por
 * preço, nunca para o começo.
 */
function byPrice(direction: 1 | -1) {
  return (a: ProductCard, b: ProductCard) => {
    const left = a.fromPriceCents;
    const right = b.fromPriceCents;

    if (left == null && right == null) return byName(a, b);
    if (left == null) return 1;
    if (right == null) return -1;

    return left === right ? byName(a, b) : (left - right) * direction;
  };
}

/**
 * Ordem da vitrine, definida arrastando os produtos no painel. Quem
 * ainda não foi posicionado vai para o fim, em ordem alfabética — é o
 * que faz produto novo entrar no fim da vitrine, nunca no começo.
 */
function byShowcase(a: ProductCard, b: ProductCard) {
  const left = a.showcaseOrder;
  const right = b.showcaseOrder;

  if (left == null && right == null) return byName(a, b);
  if (left == null) return 1;
  if (right == null) return -1;

  return left === right ? byName(a, b) : left - right;
}

function sortProducts(products: ProductCard[], sort: CatalogSort) {
  const ordered = [...products];

  switch (sort) {
    case "preco-asc":
      return ordered.sort(byPrice(1));
    case "preco-desc":
      return ordered.sort(byPrice(-1));
    case "nome":
      return ordered.sort(byName);
    default:
      return ordered.sort(byShowcase);
  }
}

export const CATALOG_PAGE_SIZE = 16;

export type CatalogPage = {
  products: ProductCard[];
  total: number;
};

export async function getCatalogProducts(
  filters: CatalogFilters,
  page = 1,
  pageSize = CATALOG_PAGE_SIZE,
  sort: CatalogSort = "padrao",
): Promise<CatalogPage> {
  const supabase = await createClient();

  let categoryId: string | null = null;
  let familyId: string | null = null;

  if (filters.categoria) {
    const { data, error } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categoria)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { products: [], total: 0 };
    categoryId = data.id;
  }

  if (filters.familia) {
    const { data, error } = await supabase
      .from("olfactory_families")
      .select("id")
      .eq("slug", filters.familia)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { products: [], total: 0 };
    familyId = data.id;
  }

  const applyFilters = <
    T extends {
      or: (filters: string) => T;
      in: (column: string, values: string[]) => T;
      eq: (column: string, value: string) => T;
    },
  >(
    builder: T,
  ): T => {
    let next = builder;

    // ilike é case-insensitive; cobre nome e marca. O termo vai escapado e
    // quebrado em palavras — vírgula e parêntese são sintaxe do PostgREST,
    // não texto de busca. (§45)
    for (const filter of searchOrFilters(filters.q ?? "")) {
      next = next.or(filter);
    }

    if (filters.genero === "feminino" || filters.genero === "masculino") {
      next = next.in("gender", [filters.genero, "unissex"]);
    }

    if (categoryId) {
      next = next.eq("category_id", categoryId);
    }

    if (familyId) {
      next = next.eq("olfactory_family_id", familyId);
    }

    return next;
  };

  /*
     Ordem por preço e filtro por faixa não podem ser resolvidos no banco:
     o preço mora em product_variants, e o PostgREST não ordena nem filtra
     por agregado de tabela relacionada. Trazemos o conjunto filtrado
     inteiro e resolvemos aqui — ainda no servidor, ainda antes de paginar,
     que é o que garante "os mais baratos do catálogo" e não "os mais
     baratos desta página".

     Isso é adequado à escala atual (dezenas de produtos). Passando da
     ordem de mil, o caminho é uma coluna min_price_cents mantida por
     trigger, aí a ordenação volta para o banco.
  */
  const { data, error } = await applyFilters(
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("active", true)
      .order("name"),
  );

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawProduct[];

  // Produto sem nenhuma versão ativa não tem o que vender.
  const all = rows
    .filter((r) => r.product_variants.length > 0)
    .map(toCard);

  const withinRange = all.filter((product) =>
    matchesPriceRange(product.fromPriceCents, filters.precoMin, filters.precoMax),
  );

  const ordered = sortProducts(withinRange, sort);

  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.max(1, Math.trunc(pageSize));
  const from = (safePage - 1) * safePageSize;

  return {
    products: ordered.slice(from, from + safePageSize),
    total: ordered.length,
  };
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


/* ---------------------------------------------------------------
   Universo de produtos que a Home pode sortear.

   O sorteio dos destaques acontece no cliente, então o servidor
   precisa entregar o catálogo inteiro — e não só os mais recentes,
   senão os produtos antigos nunca apareceriam.

   Acima de POOL_MAX o acervo não cabe num payload razoável: a
   janela desliza a cada intervalo de revalidação, de modo que todo
   o catálogo circula ao longo do dia.
   --------------------------------------------------------------- */

const POOL_MAX = 60;
const POOL_WINDOW_MS = 60_000;

export async function getProductPool(limit = POOL_MAX): Promise<ProductCard[]> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  const total = count ?? 0;

  let from = 0;
  if (total > limit) {
    const windows = Math.ceil(total / limit);
    from = (Math.floor(Date.now() / POOL_WINDOW_MS) % windows) * limit;
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

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

/**
 * Produtos ativos na ordem da vitrine, para a tela de organização do
 * painel. Vem tudo de uma vez: a ordenação por arrastar não sobrevive
 * a paginação — a posição visível não corresponderia à posição real.
 */
export async function getShowcaseProducts(): Promise<ProductCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .order("name");

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawProduct[])
    .filter((r) => r.product_variants.length > 0)
    .map(toCard)
    .sort(byShowcase);
}
