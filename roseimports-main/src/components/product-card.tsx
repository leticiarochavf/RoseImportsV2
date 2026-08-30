import Link from "next/link";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { StockBadge } from "@/components/stock-badge";
import { formatCents } from "@/lib/money";
import type { ProductCard as ProductCardData } from "@/features/catalog/queries";

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardData;
  priority?: boolean;
}) {
  const soldOut = product.stock === "esgotado";

  return (
    <article
      className="
        group/card h-full overflow-hidden rounded-xl
        border border-line bg-surface
        transition-all duration-300 ease-out
        hover:-translate-y-1
        hover:shadow-[0_14px_35px_rgba(0,0,0,0.08)]
      "
    >
      <div className="flex h-full flex-col p-3 sm:p-4">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-surface to-ivory-deep ring-1 ring-inset ring-line/70">
          <ProductImageGallery
            images={product.images}
            fallbackPath={product.imagePath}
            fallbackAlt={product.imageAlt}
            productName={product.name}
            productHref={`/produto/${product.slug}`}
            sizes="(max-width: 640px) 72vw, (max-width: 1024px) 42vw, 23vw"
            priority={priority}
            className="absolute inset-0"
            imageClassName="object-contain object-center p-3 sm:p-4"
          />

          {product.promotional && !soldOut && (
            <span
              className="
                pointer-events-none absolute left-3 top-3 z-30
                rounded-full bg-rose px-2.5 py-1
                text-[0.6rem] font-medium
                uppercase tracking-[0.1em] text-white
              "
            >
              Promoção
            </span>
          )}

          {soldOut && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-ivory/75">
              <span
                className="
                  rounded-full bg-surface px-3 py-1.5
                  text-[0.65rem] font-medium uppercase tracking-[0.1em]
                "
              >
                Esgotado
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col pt-4">
          <div>
            <div className="min-h-4">
              {product.brand && (
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-muted">
                  {product.brand}
                </p>
              )}
            </div>

            <Link
              href={`/produto/${product.slug}`}
              className="
                mt-1 block min-h-10 line-clamp-2 text-sm font-semibold leading-snug
                transition-colors duration-200
                group-hover/card:text-rose
                sm:min-h-11 sm:text-base
              "
            >
              {product.name}
            </Link>
          </div>

          <div className="mt-4">
            {product.fromPriceCents !== null && (
              <>
                {product.variantCount > 1 && (
                  <p className="mb-0.5 text-xs text-muted">
                    A partir de
                  </p>
                )}

                <p className="text-lg font-semibold leading-tight sm:text-xl">
                  {formatCents(product.fromPriceCents)}
                </p>

                <p className="mt-1 text-xs text-muted sm:text-sm">
                  Em até 3x com juros da maquininha
                </p>
              </>
            )}

            <StockBadge
              status={product.stock}
              className="mt-2"
            />
          </div>

          <div className="mt-auto pt-5">
            {soldOut ? (
              <span
                className="
                  flex h-11 w-full items-center justify-center
                  rounded-lg border border-line px-4
                  text-sm font-medium text-muted
                "
              >
                Produto esgotado
              </span>
            ) : (
              <Link
                href={`/produto/${product.slug}`}
                className="
                  flex h-11 w-full items-center justify-center
                  rounded-lg bg-rose px-4
                  text-sm font-medium text-white
                  transition-all duration-200
                  group-hover/card:-translate-y-0.5
                  group-hover/card:shadow-[0_7px_18px_rgba(0,0,0,0.12)]
                  group-active/card:translate-y-0
                  group-active/card:scale-[0.98]
                "
              >
                Comprar
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  priorityCount = 0,
}: {
  products: ProductCardData[];
  priorityCount?: number;
}) {
  return (
    <div
      className="
        grid grid-cols-2
        gap-x-3 gap-y-6
        sm:gap-x-5 sm:gap-y-8
        lg:grid-cols-4
      "
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}
