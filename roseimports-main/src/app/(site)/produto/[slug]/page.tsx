import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product-gallery";
import { TrustStrip } from "@/components/trust-strip";
import { VariantSelector } from "@/features/product/variant-selector";
import { getProductBySlug } from "@/features/catalog/queries";
import { GENDER_LABEL, PRODUCT_TYPE_LABEL } from "@/lib/labels";
import { imageUrl } from "@/lib/images";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };

  const cover = product.images[0];
  const description = product.description?.slice(0, 155) ?? `${product.name}${product.brand ? ` — ${product.brand}` : ""}. Disponível na Rose Imports.`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: cover ? [imageUrl(cover.path)] : undefined,
    },
  };
}

export default async function ProdutoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const cover = product.images[0] ?? null;
  const attributes = [
    product.brand && { label: "Marca", value: product.brand },
    product.categoryName && { label: "Categoria", value: product.categoryName },
    { label: "Tipo", value: PRODUCT_TYPE_LABEL[product.productType] ?? "—" },
    product.gender && { label: "Perfil", value: GENDER_LABEL[product.gender] },
    product.familyName && { label: "Família olfativa", value: product.familyName },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 py-7 sm:py-10 lg:py-12">
        <nav aria-label="Trilha" className="text-xs text-muted">
          <Link href="/" className="hover:text-rose">Início</Link>
          <span className="mx-2" aria-hidden>/</span>
          <Link href="/catalogo" className="hover:text-rose">Catálogo</Link>
          {product.categorySlug && product.categoryName && (
            <>
              <span className="mx-2" aria-hidden>/</span>
              <Link href={`/catalogo?categoria=${product.categorySlug}`} className="hover:text-rose">{product.categoryName}</Link>
            </>
          )}
        </nav>

        <div className="mt-6 grid gap-9 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 xl:gap-20">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="lg:pt-3">
            <header>
              <div className="flex flex-wrap items-center gap-2 text-[0.65rem] tracking-[0.12em] text-muted uppercase">
                {product.brand && <span>{product.brand}</span>}
                {product.brand && product.categoryName && <span aria-hidden>·</span>}
                {product.categoryName && <span>{product.categoryName}</span>}
              </div>
              <h1 className="mt-3 text-3xl leading-[1.08] sm:text-4xl lg:text-[2.65rem]">{product.name}</h1>
            </header>

            <div className="mt-7 border-t border-line pt-7">
              <VariantSelector product={product} coverPath={cover?.path ?? null} />
            </div>

            {product.description && (
              <section className="mt-9 border-t border-line pt-7">
                <h2 className="text-sm font-medium">Sobre o produto</h2>
                <p className="mt-3 text-sm leading-7 whitespace-pre-line text-ink-soft">{product.description}</p>
              </section>
            )}

            {attributes.length > 0 && (
              <section className="mt-8 border-t border-line pt-7">
                <h2 className="text-sm font-medium">Informações</h2>
                <dl className="mt-4 grid grid-cols-2 gap-x-7 gap-y-5">
                  {attributes.map((attribute) => (
                    <div key={attribute.label}>
                      <dt className="text-xs text-muted">{attribute.label}</dt>
                      <dd className="mt-1 text-sm">{attribute.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </div>
      </div>
      <TrustStrip />
    </>
  );
}
