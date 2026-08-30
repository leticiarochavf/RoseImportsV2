import Link from "next/link";
import { CategoryCircles } from "@/components/category-circles";
import { HeroCarousel } from "@/components/hero-carousel";
import { ProductGrid } from "@/components/product-card";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { TrustStrip } from "@/components/trust-strip";
import {
  getBestSellingProducts,
  getFeaturedProducts,
  getNewProducts,
  type ProductCard,
} from "@/features/catalog/queries";
import { formatCents } from "@/lib/money";

export const revalidate = 60;

function uniqueProducts(products: ProductCard[]) {
  return products.filter(
    (product, index, list) =>
      list.findIndex((item) => item.id === product.id) === index,
  );
}

function editorialTitle(product: ProductCard) {
  const firstName = product.name.split("/")[0]?.trim();

  if (!firstName) return product.name;

  return firstName
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)\S/g, (letter) =>
      letter.toLocaleUpperCase("pt-BR"),
    );
}

export default async function HomePage() {
  const [bestSellingRaw, featured, newProducts] = await Promise.all([
    getBestSellingProducts(4),
    getFeaturedProducts(4),
    getNewProducts(8),
  ]);

  const heroProducts = (
    featured.length > 0 ? featured : newProducts
  ).slice(0, 3);

  const heroIds = new Set(
    heroProducts.map((product) => product.id),
  );

  const bestSelling = uniqueProducts([
    ...bestSellingRaw,
    ...featured,
    ...newProducts,
  ]).slice(0, 4);

  const editorialProduct =
    [...featured, ...newProducts, ...bestSelling].find(
      (product) => !heroIds.has(product.id),
    ) ?? null;

  return (
    <main>
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <div className="overflow-hidden rounded-2xl">
          <HeroCarousel products={heroProducts} />
        </div>
      </section>

      {/* =====================================================
          CATEGORIAS REDONDAS
          ===================================================== */}
      <CategoryCircles />

      {/* =====================================================
          MAIS VENDIDOS
          ===================================================== */}
      {bestSelling.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-gold">
                Produtos que estão fazendo sucesso
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
                Mais vendidos
              </h2>
            </div>

            <Link
              href="/catalogo"
              className="
                inline-flex min-h-10 shrink-0
                items-center justify-center
                rounded-lg border border-line-strong
                px-4 text-sm font-semibold
                transition-all duration-200
                hover:-translate-y-0.5
                hover:border-rose
                hover:text-rose
              "
            >
              Ver todos
            </Link>
          </div>

          <div className="mt-7">
            <ProductGrid
              products={bestSelling}
              priorityCount={4}
            />
          </div>
        </section>
      )}

      {/* =====================================================
          DESTAQUE EDITORIAL
          ===================================================== */}
      {editorialProduct && (
        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <div
            className="
              mx-auto grid max-w-7xl
              overflow-hidden rounded-2xl
              bg-ink text-ivory
              lg:grid-cols-[0.82fr_1.18fr]
            "
          >
            {/* TEXTO */}
            <div
              className="
                order-2
                flex flex-col justify-center
                px-6 py-8
                sm:px-8 sm:py-10
                lg:order-1
                lg:px-10 lg:py-10
                xl:px-12
              "
            >
              <p className="text-xs font-semibold text-gold-soft">
                Destaque Rose Imports
              </p>

              {editorialProduct.brand && (
                <p className="mt-3 text-sm text-ivory/55">
                  {editorialProduct.brand}
                </p>
              )}

              <h2
                className="
                  mt-1 max-w-lg
                  text-2xl font-bold
                  leading-[1.15]
                  tracking-[-0.025em]
                  text-ivory
                  sm:text-3xl
                  lg:text-[2.25rem]
                "
              >
                {editorialTitle(editorialProduct)}
              </h2>

              {editorialProduct.description && (
                <p
                  className="
                    mt-4
                    max-w-[48ch]
                    line-clamp-3
                    text-sm
                    leading-6
                    text-ivory/65
                    sm:text-[0.95rem]
                  "
                >
                  {editorialProduct.description}
                </p>
              )}

              {editorialProduct.fromPriceCents !== null && (
                <div className="mt-5">
                  {editorialProduct.variantCount > 1 && (
                    <p className="mb-1 text-xs text-ivory/45">
                      A partir de
                    </p>
                  )}

                  <p className="text-2xl font-bold tracking-[-0.02em] text-ivory">
                    {formatCents(
                      editorialProduct.fromPriceCents,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-ivory/50">
                    Em até 3x com juros da maquininha
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  href={`/produto/${editorialProduct.slug}`}
                  className="
                    inline-flex min-h-11
                    items-center justify-center
                    rounded-lg bg-ivory
                    px-5
                    text-sm font-semibold
                    text-ink
                    transition-all duration-200
                    hover:-translate-y-0.5
                    hover:bg-rose-soft
                    hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)]
                    active:scale-[0.98]
                  "
                >
                  Ver produto
                </Link>

                <Link
                  href="/catalogo"
                  className="
                    inline-flex items-center gap-1
                    text-sm font-semibold
                    text-rose-soft
                    transition-all duration-200
                    hover:gap-2
                    hover:text-ivory
                  "
                >
                  Ver catálogo
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>

            {/* IMAGEM */}
            <div
              className="
                order-1
                relative
                h-[300px]
                overflow-hidden
                bg-ivory-deep
                sm:h-[360px]
                lg:order-2
                lg:h-[420px]
              "
            >
              <ProductImageGallery
                images={editorialProduct.images}
                fallbackPath={editorialProduct.imagePath}
                fallbackAlt={editorialProduct.imageAlt}
                productName={editorialProduct.name}
                productHref={`/produto/${editorialProduct.slug}`}
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="h-full w-full"
                imageClassName="object-contain object-center p-4 sm:p-6"
              />
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          BANNERS
          ===================================================== */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-7">
          <p className="text-sm font-semibold text-gold">
            Para descobrir
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
            Encontre seu próximo favorito
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* PERFUMES */}
          <Link
            href="/catalogo?categoria=perfumes"
            className="
              group relative
              min-h-[300px]
              overflow-hidden
              rounded-2xl
              bg-ivory-deep
              sm:min-h-[340px]
            "
          >
            <div
              className="
                absolute inset-0
                bg-cover bg-center
                transition-transform
                duration-700
                ease-out
                group-hover:scale-[1.035]
              "
              style={{
                backgroundImage:
                  'url("/categorias/rose-banner-perfumes.png.png")',
              }}
            />

            <div
              className="
                absolute inset-0
                bg-gradient-to-t
                from-black/70
                via-black/15
                to-transparent
              "
            />

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
              <p className="text-xs font-semibold text-rose-soft">
                Perfumes importados
              </p>

              <h3 className="mt-1 text-2xl font-bold text-white">
                Perfumes árabes
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/80">
                Fragrâncias marcantes de marcas como Lattafa,
                Armaf, Afnan e French Avenue.
              </p>

              <span
                className="
                  mt-5 inline-flex items-center gap-2
                  text-sm font-semibold text-white
                  transition-all duration-200
                  group-hover:gap-3
                "
              >
                Explorar perfumes
                <span aria-hidden>→</span>
              </span>
            </div>
          </Link>

          {/* COSMÉTICOS */}
          <Link
            href="/catalogo?categoria=cosmeticos"
            className="
              group relative
              min-h-[300px]
              overflow-hidden
              rounded-2xl
              bg-ivory-deep
              sm:min-h-[340px]
            "
          >
            <div
              className="
                absolute inset-0
                bg-cover bg-center
                transition-transform
                duration-700
                ease-out
                group-hover:scale-[1.035]
              "
              style={{
                backgroundImage:
                  'url("/categorias/rose-banner-cosmeticos.png.png")',
              }}
            />

            <div
              className="
                absolute inset-0
                bg-gradient-to-t
                from-black/65
                via-black/10
                to-transparent
              "
            />

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
              <p className="text-xs font-semibold text-rose-soft">
                Beleza & cuidados
              </p>

              <h3 className="mt-1 text-2xl font-bold text-white">
                Skincare
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/80">
                Cuidados, ativos e tecnologia para deixar sua rotina
                de beleza ainda mais completa.
              </p>

              <span
                className="
                  mt-5 inline-flex items-center gap-2
                  text-sm font-semibold text-white
                  transition-all duration-200
                  group-hover:gap-3
                "
              >
                Explorar cosméticos
                <span aria-hidden>→</span>
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* =====================================================
          BENEFÍCIOS / CONFIANÇA
          ===================================================== */}
      <TrustStrip />
    </main>
  );
}
