import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { ProductForm } from "@/features/admin/product-form";
import { VariantManager } from "@/features/admin/variant-manager";
import { ImageManager } from "@/features/admin/image-manager";
import type { Category, OlfactoryFamily } from "@/features/catalog/types";
import type { Product, ProductImage, ProductVariant } from "@/types/database";

export const metadata: Metadata = { title: "Editar produto" };
export const dynamic = "force-dynamic";

export default async function EditarProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ criado?: string }>;
}) {
  // Painel exige perfil de administrador, não só sessão. (§34)
  await requireAdminUser();

  const { id } = await params;
  const { criado } = await searchParams;
  const supabase = await createClient();

  const [productResult, variantsResult, imagesResult, categories, families] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", id)
        .order("sort_order"),
      supabase
        .from("product_images")
        .select("*")
        .eq("product_id", id)
        .order("sort_order"),
      supabase.from("categories").select("id, name, slug").order("sort_order"),
      supabase
        .from("olfactory_families")
        .select("id, name, slug")
        .order("sort_order"),
    ]);

  if (!productResult.data) notFound();

  const product = productResult.data as Product;

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/produtos"
        className="text-xs tracking-[0.12em] text-muted uppercase hover:text-rose"
      >
        ← Produtos
      </Link>

      <header className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl">{product.name}</h1>
        {product.active && (
          <Link
            href={`/produto/${product.slug}`}
            target="_blank"
            className="text-xs tracking-[0.12em] text-rose uppercase hover:underline"
          >
            Ver no site
          </Link>
        )}
      </header>

      {criado && (
        <p
          role="status"
          className="mt-5 border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
        >
          Produto criado. Agora adicione as versões e as imagens abaixo.
        </p>
      )}

      {(variantsResult.data ?? []).length === 0 && (
        <p className="mt-5 border-l-2 border-gold-soft bg-ivory-deep/50 px-4 py-3 text-sm text-ink-soft">
          Este produto ainda não aparece no catálogo: falta cadastrar pelo menos
          uma versão com preço.
        </p>
      )}

      <section className="mt-9">
        <ProductForm
          product={product}
          categories={(categories.data ?? []) as Category[]}
          families={(families.data ?? []) as OlfactoryFamily[]}
        />
      </section>

      <section className="mt-14 border-t border-line pt-9">
        <VariantManager
          productId={product.id}
          variants={(variantsResult.data ?? []) as ProductVariant[]}
        />
      </section>

      <section className="mt-14 border-t border-line pt-9">
        <ImageManager
          productId={product.id}
          productName={product.name}
          images={(imagesResult.data ?? []) as ProductImage[]}
        />
      </section>
    </div>
  );
}
