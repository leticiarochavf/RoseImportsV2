"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductImage } from "@/components/product-image";
import type { ProductCard } from "@/features/catalog/queries";
import { formatCents } from "@/lib/money";

const DEFAULT_DESCRIPTION =
  "Conheça uma seleção especial da Rose Imports e confira as opções disponíveis.";

function summarize(description: string | null) {
  if (!description) return DEFAULT_DESCRIPTION;

  const clean = description.replace(/\s+/g, " ").trim();

  return clean.length > 125
    ? `${clean.slice(0, 122).trimEnd()}…`
    : clean;
}

function formatHeroTitle(name: string) {
  const firstProduct = name.split("/")[0]?.trim() || name;

  const withoutMeta = firstProduct
    .replace(/\bEDP\b/gi, "")
    .replace(/\bEDT\b/gi, "")
    .replace(/\b\d+\s*ML\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const lowercaseWords = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
  ]);

  return withoutMeta
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((word, index) => {
      if (index > 0 && lowercaseWords.has(word)) {
        return word;
      }

      return (
        word.charAt(0).toLocaleUpperCase("pt-BR") +
        word.slice(1)
      );
    })
    .join(" ");
}

function formatHeroMeta(name: string) {
  const upper = name.toUpperCase();

  let concentration: string | null = null;

  if (upper.includes("EDP")) {
    concentration = "Eau de Parfum";
  } else if (upper.includes("EDT")) {
    concentration = "Eau de Toilette";
  }

  const volume = name.match(/(\d+)\s*ML/i)?.[1];

  return [
    concentration,
    volume ? `${volume} ml` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function HeroCarousel({
  products,
}: {
  products: ProductCard[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (products.length === 0) {
    return (
      <section
        className="
          grid min-h-[320px]
          place-items-center
          bg-surface
          px-6 py-10
          text-center
          sm:min-h-[360px]
          lg:min-h-[400px]
        "
      >
        <div>
          <p className="text-sm font-semibold text-rose">
            Rose Imports
          </p>

          <h1
            className="
              mx-auto mt-3
              max-w-xl
              text-3xl font-bold
              leading-tight
              tracking-[-0.025em]
              sm:text-4xl
            "
          >
            Perfumes e cosméticos  importados.
          </h1>

          <p
            className="
              mx-auto mt-4
              max-w-lg
              text-sm leading-6
              text-muted
              sm:text-base
            "
          >
            Produtos selecionados para deixar sua experiência de compra
            mais simples e especial.
          </p>

          <Link
            href="/catalogo"
            className="
              mt-6 inline-flex min-h-11
              items-center justify-center
              rounded-lg bg-rose
              px-5
              text-sm font-semibold
              text-white
              transition-all duration-200
              hover:-translate-y-0.5
              hover:bg-rose-deep
              hover:shadow-md
              active:translate-y-0
              active:scale-[0.98]
            "
          >
            Ver catálogo
          </Link>
        </div>
      </section>
    );
  }

  const product = products[activeIndex] ?? products[0];

  if (!product) return null;

  const total = products.length;

  const goTo = (index: number) => {
    setActiveIndex((index + total) % total);
  };

  const heroTitle = formatHeroTitle(product.name);
  const heroMeta = formatHeroMeta(product.name);

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques da Rose Imports"
      className="
        grid overflow-hidden
        bg-surface
        lg:grid-cols-[0.9fr_1.1fr]
      "
    >
      {/* IMAGEM */}
      <div
        className="
          group/image
          relative
          min-h-[260px]
          overflow-hidden
          bg-ivory-deep

          [&_img]:object-cover
          [&_img]:transition-transform
          [&_img]:duration-700
          [&_img]:ease-out

          sm:min-h-[320px]
          lg:min-h-[430px]

          lg:group-hover/image:[&_img]:scale-[1.015]
        "
      >
        <ProductImage
          path={product.imagePath}
          alt={product.imageAlt ?? product.name}
          sizes="(max-width: 1024px) 100vw, 45vw"
          priority
        />

        {/* Overlay */}
        <div
          className="
            pointer-events-none
            absolute inset-0
            bg-gradient-to-t
            from-black/10
            via-transparent
            to-transparent
          "
        />

        {/* SETAS */}
        {total > 1 && (
          <>
            {/* Anterior */}
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Destaque anterior"
              className="
                absolute left-4 top-1/2 z-20
                flex h-11 w-11
                -translate-y-1/2
                items-center justify-center
                rounded-full
                border border-white/40
                bg-white/90
                text-ink
                shadow-sm
                backdrop-blur-sm
                transition-all duration-300 ease-out

                hover:bg-rose
                hover:text-white
                hover:shadow-md

                active:scale-95

                lg:-translate-x-2
                lg:opacity-0
                lg:group-hover/image:translate-x-0
                lg:group-hover/image:opacity-100
              "
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            {/* Próximo */}
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Próximo destaque"
              className="
                absolute right-4 top-1/2 z-20
                flex h-11 w-11
                -translate-y-1/2
                items-center justify-center
                rounded-full
                border border-white/40
                bg-white/90
                text-ink
                shadow-sm
                backdrop-blur-sm
                transition-all duration-300 ease-out

                hover:bg-rose
                hover:text-white
                hover:shadow-md

                active:scale-95

                lg:translate-x-2
                lg:opacity-0
                lg:group-hover/image:translate-x-0
                lg:group-hover/image:opacity-100
              "
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* INFORMAÇÕES */}
      <div
        className="
          flex min-w-0 flex-col
          justify-center
          bg-gradient-to-br
          from-surface
          to-rose-wash/30
          px-6 py-8
          sm:px-8 sm:py-10
          lg:px-10 lg:py-10
          xl:px-12
        "
      >
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="
              rounded-full
              bg-rose/10
              px-3 py-1
              text-xs font-semibold
              text-rose
            "
          >
            Novidade
          </span>

          {product.brand && (
            <span
              className="
                rounded-full
                bg-gold-soft/30
                px-3 py-1
                text-xs font-semibold
                text-gold
              "
            >
              {product.brand}
            </span>
          )}
        </div>

        {/* Nome */}
        <h1
          className="
            mt-4
            max-w-[17ch]
            text-3xl font-bold
            leading-[1.05]
            tracking-[-0.035em]
            text-ink
            sm:text-4xl
            lg:text-[2.8rem]
          "
        >
          {heroTitle}
        </h1>

        {/* Tipo + volume */}
        {heroMeta && (
          <p className="mt-2 text-sm font-medium text-muted sm:text-base">
            {heroMeta}
          </p>
        )}

        <div className="mt-4 h-[2px] w-10 rounded-full bg-rose/40" />

        {/* Descrição */}
        <p
          className="
            mt-4
            max-w-lg
            text-sm leading-6
            text-ink-soft
            sm:text-base
          "
        >
          {summarize(product.description)}
        </p>

        {/* PREÇO */}
        {product.fromPriceCents !== null && (
          <div className="mt-5">
            {product.variantCount > 1 && (
              <p className="mb-1 text-xs text-muted">
                A partir de
              </p>
            )}

            <p className="text-2xl font-bold tracking-[-0.025em]">
              {formatCents(product.fromPriceCents)}
            </p>

            <p className="mt-1 text-sm text-muted">
              Em até 3x com juros da maquininha
            </p>
          </div>
        )}

        {/* BOTÕES */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/produto/${product.slug}`}
            className="
              inline-flex min-h-11
              items-center justify-center
              rounded-lg bg-rose
              px-5
              text-sm font-semibold
              text-white
              transition-all duration-200
              hover:-translate-y-0.5
              hover:bg-rose-deep
              hover:shadow-[0_8px_20px_rgba(0,0,0,0.10)]
              active:translate-y-0
              active:scale-[0.98]
            "
          >
            Ver produto
          </Link>

          <Link
            href="/catalogo"
            className="
              inline-flex min-h-11
              items-center justify-center
              rounded-lg
              border border-line-strong
              bg-surface
              px-5
              text-sm font-semibold
              text-ink
              transition-all duration-200
              hover:border-rose
              hover:text-rose
            "
          >
            Ver catálogo
          </Link>
        </div>

        {/* INDICADORES */}
        {total > 1 && (
          <div className="mt-6 flex items-center gap-2">
            {products.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Ir para o destaque ${index + 1}`}
                aria-current={
                  index === activeIndex
                    ? "true"
                    : undefined
                }
                className={`
                  h-1 rounded-full
                  transition-all duration-300
                  ${
                    index === activeIndex
                      ? "w-7 bg-rose"
                      : "w-3 bg-rose-soft/60 hover:bg-rose-soft"
                  }
                `}
              />
            ))}

            <span className="ml-2 text-xs text-muted">
              {activeIndex + 1} de {total}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}