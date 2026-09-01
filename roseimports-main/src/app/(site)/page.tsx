import Link from "next/link";
import { BestSellersGrid } from "@/components/best-sellers-grid";
import { CategoryCircles } from "@/components/category-circles";
import { EditorialBand } from "@/components/editorial-band";
import { HeroCarousel } from "@/components/hero-carousel";
import { TrustStrip } from "@/components/trust-strip";
import {
  getBestSellingProducts,
  getProductPool,
} from "@/features/catalog/queries";
import { HomePicks } from "@/features/home/home-picks";

export const revalidate = 60;

/** Vagas da vitrine. O ranking real ocupa as primeiras; o resto é sorteado. */
const CAROUSEL_COUNT = 4;

export default async function HomePage() {
  const [pool, bestSellingRaw] = await Promise.all([
    getProductPool(),
    getBestSellingProducts(CAROUSEL_COUNT),
  ]);

  // Só entram como fixos os que realmente têm venda e estão no pool.
  const poolIds = new Set(pool.map((product) => product.id));
  const fixedCarouselIds = bestSellingRaw
    .filter((product) => poolIds.has(product.id))
    .slice(0, CAROUSEL_COUNT)
    .map((product) => product.id);

  return (
    <HomePicks pool={pool} fixedCarouselIds={fixedCarouselIds}>
      <main>
      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <div className="overflow-hidden rounded-2xl">
          <HeroCarousel />
        </div>
      </section>

      {/* =====================================================
          CATEGORIAS REDONDAS
          ===================================================== */}
      <CategoryCircles />

      {/* =====================================================
          MAIS VENDIDOS
          ===================================================== */}
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
            <BestSellersGrid priorityCount={4} />
          </div>
        </section>

      {/* =====================================================
          DESTAQUE EDITORIAL
          ===================================================== */}
      <EditorialBand />

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
                from-black/85
                via-black/40
                to-black/10
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
                from-black/85
                via-black/40
                to-black/10
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
    </HomePicks>
  );
}
