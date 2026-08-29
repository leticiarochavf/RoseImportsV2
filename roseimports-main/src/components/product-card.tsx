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
    <article className="group h-full">
      <Link href={`/produto/${product.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface">
          <ProductImage
            path={product.imagePath}
            alt={product.imageAlt ?? product.name}
            sizes="(max-width: 640px) 72vw, (max-width: 1024px) 42vw, 23vw"
            priority={priority}
          />

          {product.promotional && !soldOut && (
            <span className="absolute top-3 left-3 rounded-full bg-rose px-2.5 py-1 text-[0.6rem] tracking-[0.12em] text-white uppercase">
              Promoção
            </span>
          )}

          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-ivory/75">
              <span className="rounded-full bg-surface px-3 py-1.5 text-[0.65rem] tracking-[0.12em] uppercase">Esgotado</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col pt-3.5">
          <div className="min-h-11">
            {product.brand && <p className="text-[0.65rem] tracking-[0.08em] text-muted uppercase">{product.brand}</p>}
            <h3 className="mt-1 text-sm font-normal leading-snug transition-colors group-hover:text-rose">{product.name}</h3>
          </div>

          {product.fromPriceCents !== null && (
            <p className="mt-3 text-sm">
              {product.variantCount > 1 && <span className="mr-1 text-xs text-muted">a partir de</span>}
              <span className="font-medium">{formatCents(product.fromPriceCents)}</span>
            </p>
          )}
          <StockBadge status={product.stock} className="mt-1.5" />
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 lg:grid-cols-4">
      {products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < priorityCount} />)}
    </div>
  );
}
