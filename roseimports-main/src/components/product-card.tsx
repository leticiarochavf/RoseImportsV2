import Link from "next/link";
import { ProductImage } from "@/components/product-image";
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
        group h-full overflow-hidden rounded-xl
        border border-line bg-surface
        transition-all duration-300 ease-out
        hover:-translate-y-1
        hover:shadow-[0_14px_35px_rgba(0,0,0,0.08)]
      "
    >
      <Link
        href={`/produto/${product.slug}`}
        className="flex h-full flex-col p-3 sm:p-4"
      >
        <div className="relative aspect-square overflow-hidden rounded-lg bg-surface">
          <div
            className="
              absolute inset-0
              transition-all duration-500 ease-out
              group-hover:scale-[1.04]
              group-hover:drop-shadow-[0_12px_18px_rgba(0,0,0,0.12)]
            "
          >
            <ProductImage
              path={product.imagePath}
              alt={product.imageAlt ?? product.name}
              sizes="(max-width: 640px) 72vw, (max-width: 1024px) 42vw, 23vw"
              priority={priority}
            />
          </div>

          {product.promotional && !soldOut && (
            <span
              className="
                absolute left-3 top-3 z-10
                rounded-full bg-rose px-2.5 py-1
                text-[0.6rem] font-medium
                uppercase tracking-[0.1em] text-white
              "
            >
              Promoção
            </span>
          )}

          {soldOut && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-ivory/75">
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
            {product.brand && (
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-muted">
                {product.brand}
              </p>
            )}

            <h3
              className="
                mt-1 text-sm font-semibold leading-snug
                transition-colors duration-200
                group-hover:text-rose
                sm:text-base
              "
            >
              {product.name}
            </h3>
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
            <span
              className={`
                flex h-11 w-full items-center justify-center
                rounded-lg px-4
                text-sm font-medium
                transition-all duration-200
                ${
                  soldOut
                    ? "cursor-not-allowed border border-line text-muted"
                    : `
                      bg-rose text-white
                      group-hover:-translate-y-0.5
                      group-hover:shadow-[0_7px_18px_rgba(0,0,0,0.12)]
                      group-active:translate-y-0
                      group-active:scale-[0.98]
                    `
                }
              `}
            >
              {soldOut ? "Produto esgotado" : "Comprar"}
            </span>
          </div>
        </div>
      </Link>
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