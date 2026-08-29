import Link from "next/link";
import { Logo } from "@/components/logo";
import { ProductImage } from "@/components/product-image";
import { ProductCarousel } from "@/components/product-carousel";
import { SectionHeading } from "@/components/section-heading";
import { TrustStrip } from "@/components/trust-strip";
import {
  getBestSellingProducts,
  getCategories,
  getFeaturedProducts,
  getNewProducts,
} from "@/features/catalog/queries";

export const revalidate = 60;

const AUDIENCE = [
  { label: "Masculino", href: "/catalogo?genero=masculino" },
  { label: "Feminino", href: "/catalogo?genero=feminino" },
] as const;

export default async function HomePage() {
  const [bestSellingRaw, featured, newProducts, categories] = await Promise.all([
    getBestSellingProducts(10),
    getFeaturedProducts(10),
    getNewProducts(10),
    getCategories(),
  ]);

  const bestSelling = bestSellingRaw.length >= 3
    ? bestSellingRaw
    : [...bestSellingRaw, ...featured, ...newProducts]
        .filter((product, index, list) => list.findIndex((item) => item.id === product.id) === index)
        .slice(0, 10);

  const featuredClean = featured
    .filter((product) => !bestSellingRaw.some((best) => best.id === product.id))
    .slice(0, 10);

  const heroProduct = featured[0] ?? newProducts[0] ?? bestSelling[0] ?? null;

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-20">
          <div className="max-w-xl">
            <Logo variant="full" className="w-44 sm:w-52" />
            <p className="eyebrow mt-7">Escolha com calma. Compre com facilidade.</p>
            <h1 className="mt-3 text-4xl leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
              Importados para o seu dia a dia.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
              Perfumes, cosméticos e eletrônicos organizados em uma vitrine simples, com as informações que você precisa para escolher melhor.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/catalogo" className="inline-flex min-h-12 items-center justify-center bg-ink px-7 text-xs tracking-[0.16em] text-ivory uppercase transition-opacity hover:opacity-85">
                Ver catálogo
              </Link>
              <Link href="/catalogo?categoria=perfumes" className="inline-flex min-h-12 items-center justify-center border border-line-strong px-7 text-xs tracking-[0.16em] uppercase transition-colors hover:border-rose hover:text-rose">
                Ver perfumes
              </Link>
            </div>
          </div>

          <div className="relative min-h-[22rem] overflow-hidden rounded-xl bg-ivory-deep sm:min-h-[30rem]">
            {heroProduct ? (
              <>
                <ProductImage
                  path={heroProduct.imagePath}
                  alt={heroProduct.imageAlt ?? heroProduct.name}
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent px-6 pt-24 pb-6 text-white sm:px-8 sm:pb-8">
                  <p className="text-[0.65rem] tracking-[0.18em] uppercase opacity-80">Em destaque</p>
                  <div className="mt-2 flex items-end justify-between gap-5">
                    <div>
                      <h2 className="font-display text-2xl sm:text-3xl">{heroProduct.name}</h2>
                      {heroProduct.brand && <p className="mt-1 text-xs opacity-80">{heroProduct.brand}</p>}
                    </div>
                    <Link href={`/produto/${heroProduct.slug}`} className="shrink-0 border border-white/60 px-4 py-2 text-[0.65rem] tracking-[0.12em] uppercase transition-colors hover:bg-white hover:text-ink">
                      Conhecer
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[22rem] items-center justify-center sm:min-h-[30rem]">
                <Logo variant="full" className="w-56 opacity-70" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-9 sm:py-11">
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((category) => (
            <Link key={category.id} href={`/catalogo?categoria=${category.slug}`} className="shrink-0 rounded-full border border-line bg-surface px-5 py-2.5 text-sm transition-colors hover:border-rose hover:text-rose">
              {category.name}
            </Link>
          ))}
          {AUDIENCE.map((item) => (
            <Link key={item.label} href={item.href} className="shrink-0 rounded-full border border-line bg-surface px-5 py-2.5 text-sm transition-colors hover:border-rose hover:text-rose">
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {bestSelling.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
          <div className="flex items-end justify-between gap-5">
            <SectionHeading eyebrow="Escolhas frequentes" title="Mais vendidos" />
            <Link href="/catalogo" className="hidden text-xs tracking-[0.12em] text-muted uppercase transition-colors hover:text-rose sm:block">Ver todos →</Link>
          </div>
          <div className="mt-8"><ProductCarousel products={bestSelling} priorityCount={4} /></div>
        </section>
      )}

      {featuredClean.length > 0 && (
        <section className="border-y border-line bg-ivory-deep/35">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
            <div className="flex items-end justify-between gap-5">
              <SectionHeading eyebrow="Curadoria Rose Imports" title="Em destaque" />
              <Link href="/catalogo" className="hidden text-xs tracking-[0.12em] text-muted uppercase transition-colors hover:text-rose sm:block">Ver todos →</Link>
            </div>
            <div className="mt-8"><ProductCarousel products={featuredClean} /></div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-14 sm:py-18">
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/catalogo?categoria=perfumes" className="group min-h-48 rounded-lg border border-line bg-surface p-7 transition-colors hover:border-rose">
            <p className="eyebrow">Perfumes</p>
            <h2 className="mt-3 max-w-xs text-2xl">Fragrâncias para diferentes estilos.</h2>
            <span className="mt-8 inline-block text-xs tracking-[0.12em] text-rose uppercase">Explorar →</span>
          </Link>
          <Link href="/catalogo?categoria=cosmeticos" className="group min-h-48 rounded-lg border border-line bg-surface p-7 transition-colors hover:border-rose">
            <p className="eyebrow">Cosméticos</p>
            <h2 className="mt-3 max-w-xs text-2xl">Cuidados e beleza em uma seleção objetiva.</h2>
            <span className="mt-8 inline-block text-xs tracking-[0.12em] text-rose uppercase">Explorar →</span>
          </Link>
          <Link href="/catalogo?categoria=eletronicos" className="group min-h-48 rounded-lg border border-line bg-surface p-7 transition-colors hover:border-rose">
            <p className="eyebrow">Eletrônicos</p>
            <h2 className="mt-3 max-w-xs text-2xl">Tecnologia útil sem complicar a escolha.</h2>
            <span className="mt-8 inline-block text-xs tracking-[0.12em] text-rose uppercase">Explorar →</span>
          </Link>
        </div>
      </section>

      <TrustStrip />
    </>
  );
}
