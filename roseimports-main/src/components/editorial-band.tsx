"use client";

import Link from "next/link";
import { ProductImageGallery } from "@/components/product-image-gallery";
import type { ProductCard } from "@/features/catalog/queries";
import { useHomePicks } from "@/features/home/home-picks";
import { formatCents } from "@/lib/money";

function editorialTitle(product: ProductCard) {
  const firstName = product.name.split("/")[0]?.trim();

  if (!firstName) return product.name;

  return firstName
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)\S/g, (letter) =>
      letter.toLocaleUpperCase("pt-BR"),
    );
}

/**
 * Destaque editorial. O produto sai do mesmo sorteio do hero e do
 * carrossel, então nunca repete nada que já esteja na página.
 */
export function EditorialBand() {
  const { editorial: editorialProduct, ready } = useHomePicks();

  if (!editorialProduct) return null;

  return (
    <section
      className={`px-4 py-5 sm:px-6 lg:px-8 ${ready ? "" : "opacity-0"}`}
    >
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
            imageClassName="object-contain object-center"
          />
        </div>
      </div>
    </section>
  );
}
