import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";

import { ProductForm } from "@/features/admin/product-form";
import { VariantManager } from "@/features/admin/variant-manager";
import { ImageManager } from "@/features/admin/image-manager";

import type {
  Category,
  OlfactoryFamily,
} from "@/features/catalog/types";

import type {
  Product,
  ProductImage,
  ProductVariant,
} from "@/types/database";

export const metadata: Metadata = {
  title: "Editar produto",
};

export const dynamic = "force-dynamic";

type Step =
  | "informacoes"
  | "preco"
  | "imagens";

export default async function EditarProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    criado?: string;
    etapa?: string;
    finalizado?: string;
  }>;
}) {
  await requireAdminUser();

  const { id } = await params;

  const {
    criado,
    etapa,
    finalizado,
  } = await searchParams;

  const supabase =
    await createClient();

  const [
    productResult,
    variantsResult,
    imagesResult,
    categoriesResult,
    familiesResult,
  ] = await Promise.all([
    /* PRODUTO */

    supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle(),

    /* VARIAÇÕES */

    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("sort_order"),

    /* IMAGENS */

    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .order("sort_order"),

    /* SOMENTE CATEGORIAS ATIVAS */

    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("active", true)
      .order("sort_order"),

    /* SOMENTE FAMÍLIAS ATIVAS */

    supabase
      .from("olfactory_families")
      .select("id, name, slug")
      .eq("active", true)
      .order("sort_order"),
  ]);

  if (!productResult.data) {
    notFound();
  }

  const product =
    productResult.data as Product;

  const variants =
    (variantsResult.data ??
      []) as ProductVariant[];

  const images =
    (imagesResult.data ??
      []) as ProductImage[];

  const categories =
    (categoriesResult.data ??
      []) as Category[];

  const families =
    (familiesResult.data ??
      []) as OlfactoryFamily[];

  const hasVariants =
    variants.length > 0;

  const hasImages =
    images.length > 0;

  /*
   * Define qual etapa será mostrada.
   *
   * Nenhuma etapa na URL:
   * mostra Informações.
   */
  const currentStep: Step =
    etapa === "preco"
      ? "preco"
      : etapa === "imagens"
        ? "imagens"
        : "informacoes";

  /*
   * Produto inativo durante cadastro
   * funciona como rascunho.
   *
   * Isso mantém o botão "Finalizar produto"
   * disponível até a publicação.
   */
  const onboarding =
    Boolean(criado) ||
    !product.active;

  /*
   * URLs das etapas.
   */
  const infoUrl =
    `/admin/produtos/${product.id}?etapa=informacoes`;

  const priceUrl =
    `/admin/produtos/${product.id}?etapa=preco`;

  const imagesUrl =
    `/admin/produtos/${product.id}?etapa=imagens`;

  /* =============================================================
     PRODUTO FINALIZADO
  ============================================================== */

  if (finalizado) {
    return (
      <div className="max-w-4xl">
        <Link
          href="/admin/produtos"
          className="
            text-xs
            tracking-[0.1em]
            text-muted uppercase
            transition-colors
            hover:text-rose
          "
        >
          ← Voltar para produtos
        </Link>

        <section
          className="
            mt-8
            border border-success/30
            bg-success/5
            px-6 py-12
            text-center
            sm:px-10
          "
        >
          <div
            className="
              mx-auto
              flex h-12 w-12
              items-center justify-center
              rounded-full
              bg-success
              text-lg text-white
            "
          >
            ✓
          </div>

          <p className="mt-5 text-xs font-medium tracking-[0.1em] text-success uppercase">
            Cadastro concluído
          </p>

          <h1 className="mt-2 text-2xl text-ink">
            Produto finalizado
          </h1>

          <p
            className="
              mx-auto mt-2
              max-w-lg
              text-sm leading-relaxed
              text-muted
            "
          >
            As informações, preço, estoque
            e imagens foram cadastrados com
            sucesso.
          </p>

          <div
            className="
              mt-7
              flex flex-wrap
              justify-center
              gap-3
            "
          >
            {product.active && (
              <Link
                href={`/produto/${product.slug}`}
                target="_blank"
                className="
                  bg-ink
                  px-5 py-3
                  text-xs font-medium
                  tracking-[0.1em]
                  text-ivory uppercase
                  transition-opacity
                  hover:opacity-90
                "
              >
                Ver no site ↗
              </Link>
            )}

            <Link
              href="/admin/produtos"
              className="
                border border-line
                bg-surface
                px-5 py-3
                text-xs font-medium
                tracking-[0.1em]
                uppercase
                transition
                hover:border-ink
              "
            >
              Voltar para produtos
            </Link>

            <Link
              href={infoUrl}
              className="
                border border-line
                bg-surface
                px-5 py-3
                text-xs font-medium
                tracking-[0.1em]
                uppercase
                transition
                hover:border-ink
              "
            >
              Editar produto
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* =====================================================
          VOLTAR
      ====================================================== */}

      <Link
        href="/admin/produtos"
        className="
          text-xs
          tracking-[0.1em]
          text-muted uppercase
          transition-colors
          hover:text-rose
        "
      >
        ← Voltar para produtos
      </Link>

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <header
        className="
          mt-5
          flex flex-col gap-4
          border-b border-line
          pb-6
          sm:flex-row
          sm:items-end
          sm:justify-between
        "
      >
        <div>
          <p className="eyebrow">
            {onboarding
              ? "Cadastro de produto"
              : "Editar produto"}
          </p>

          <h1 className="mt-1 text-2xl">
            {product.name}
          </h1>

          <p className="mt-2 max-w-xl text-sm text-muted">
            {onboarding
              ? "Complete as três etapas para publicar o produto."
              : "Gerencie informações, preço, estoque e imagens."}
          </p>
        </div>

        {product.active && (
          <Link
            href={`/produto/${product.slug}`}
            target="_blank"
            className="
              inline-flex w-fit
              items-center justify-center
              border border-line
              bg-surface
              px-4 py-2.5
              text-xs font-medium
              tracking-[0.08em]
              uppercase
              transition
              hover:border-ink
            "
          >
            Ver no site ↗
          </Link>
        )}
      </header>

      {/* =====================================================
          ETAPAS
      ====================================================== */}

      <nav
        className="
          mt-7
          grid
          overflow-hidden
          border border-line
          bg-line
          sm:grid-cols-3
        "
        aria-label="Etapas do produto"
      >
        {/* ETAPA 1 */}

        <StepLink
          href={infoUrl}
          number="1"
          title="Informações"
          description="Dados principais"
          active={
            currentStep ===
            "informacoes"
          }
          completed={
            currentStep !==
              "informacoes" ||
            hasVariants ||
            hasImages
          }
        />

        {/* ETAPA 2 */}

        <StepLink
          href={priceUrl}
          number="2"
          title="Preço e estoque"
          description={
            hasVariants
              ? `${variants.length} ${
                  variants.length === 1
                    ? "versão"
                    : "versões"
                }`
              : "Pendente"
          }
          active={
            currentStep === "preco"
          }
          completed={hasVariants}
        />

        {/* ETAPA 3 */}

        <StepLink
          href={
            hasVariants
              ? imagesUrl
              : undefined
          }
          number="3"
          title="Imagens"
          description={
            hasImages
              ? `${images.length} ${
                  images.length === 1
                    ? "imagem"
                    : "imagens"
                }`
              : "Pendente"
          }
          active={
            currentStep ===
            "imagens"
          }
          completed={hasImages}
          disabled={!hasVariants}
        />
      </nav>

      {/* =====================================================
          ETAPA 1
          INFORMAÇÕES
      ====================================================== */}

      {currentStep ===
        "informacoes" && (
        <section
          className="
            mt-7
            border border-line
            bg-surface
            p-5
            sm:p-7
          "
        >
          <div className="border-b border-line pb-5">
            <p className="text-xs font-medium tracking-[0.08em] text-muted uppercase">
              Etapa 1 de 3
            </p>

            <h2 className="mt-1 text-lg font-medium text-ink">
              Informações do produto
            </h2>

            <p className="mt-1 text-sm text-muted">
              Nome, categoria, marca e
              informações principais.
            </p>
          </div>

          <div className="mt-7">
            <ProductForm
              product={product}
              categories={categories}
              families={families}
            />
          </div>

          {/* CONTINUAR PARA PREÇO */}

          <div
            className="
              mt-7
              flex justify-end
              border-t border-line
              pt-6
            "
          >
            <Link
              href={priceUrl}
              className="
                inline-flex
                items-center justify-center
                border border-line
                bg-surface
                px-5 py-3
                text-xs font-medium
                tracking-[0.1em]
                text-ink uppercase
                transition
                hover:border-ink
              "
            >
              Ir para preço e estoque →
            </Link>
          </div>
        </section>
      )}

      {/* =====================================================
          ETAPA 2
          PREÇO E ESTOQUE
      ====================================================== */}

      {currentStep ===
        "preco" && (
        <section
          className="
            mt-7
            border border-line
            bg-surface
            p-5
            sm:p-7
          "
        >
          <div className="mb-7 border-b border-line pb-5">
            <p className="text-xs font-medium tracking-[0.08em] text-muted uppercase">
              Etapa 2 de 3
            </p>

            <h2 className="mt-1 text-lg font-medium text-ink">
              Preço e estoque
            </h2>

            <p className="mt-1 text-sm text-muted">
              Defina volume, preço e
              quantidade disponível.
            </p>
          </div>

          <VariantManager
            productId={product.id}
            variants={variants}
            onboarding={
              onboarding ||
              !hasVariants
            }
          />

          {/* VOLTAR */}

          <div
            className="
              mt-7
              border-t border-line
              pt-6
            "
          >
            <Link
              href={infoUrl}
              className="
                text-xs font-medium
                tracking-[0.08em]
                text-muted uppercase
                hover:text-ink
              "
            >
              ← Voltar para informações
            </Link>
          </div>
        </section>
      )}

      {/* =====================================================
          ETAPA 3
          IMAGENS
      ====================================================== */}

      {currentStep ===
        "imagens" && (
        <section
          className="
            mt-7
            border border-line
            bg-surface
            p-5
            sm:p-7
          "
        >
          <div className="mb-7 border-b border-line pb-5">
            <p className="text-xs font-medium tracking-[0.08em] text-muted uppercase">
              Etapa 3 de 3
            </p>

            <h2 className="mt-1 text-lg font-medium text-ink">
              Imagens do produto
            </h2>

            <p className="mt-1 text-sm text-muted">
              Adicione as fotos do produto.
              Elas são salvas automaticamente
              durante o envio.
            </p>
          </div>

          {!hasVariants ? (
            <div
              className="
                border border-line
                bg-ivory/30
                px-5 py-10
                text-center
              "
            >
              <p className="text-sm font-medium text-ink">
                Cadastre preço e estoque
                primeiro
              </p>

              <p className="mt-1 text-xs text-muted">
                É necessário ter pelo menos
                uma versão antes de adicionar
                as fotos.
              </p>

              <Link
                href={priceUrl}
                className="
                  mt-5
                  inline-flex
                  bg-ink
                  px-5 py-3
                  text-xs font-medium
                  tracking-[0.1em]
                  text-ivory uppercase
                  transition-opacity
                  hover:opacity-90
                "
              >
                Ir para preço e estoque
              </Link>
            </div>
          ) : (
            <ImageManager
              productId={product.id}
              productName={
                product.name
              }
              images={images}
              onboarding={onboarding}
            />
          )}

          {/* VOLTAR */}

          <div
            className="
              mt-7
              border-t border-line
              pt-6
            "
          >
            <Link
              href={priceUrl}
              className="
                text-xs font-medium
                tracking-[0.08em]
                text-muted uppercase
                hover:text-ink
              "
            >
              ← Voltar para preço e estoque
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

/* =============================================================
   ITEM DAS ETAPAS
============================================================= */

function StepLink({
  href,
  number,
  title,
  description,
  active,
  completed,
  disabled = false,
}: {
  href?: string;

  number: string;

  title: string;

  description: string;

  active: boolean;

  completed: boolean;

  disabled?: boolean;
}) {
  const content = (
    <div
      className={`
        h-full
        bg-surface
        px-5 py-5
        transition-colors

        ${
          active
            ? "border-b-2 border-rose sm:border-b-0 sm:border-l-2"
            : ""
        }

        ${
          disabled
            ? "cursor-not-allowed opacity-45"
            : "hover:bg-ivory/40"
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            flex h-8 w-8
            shrink-0
            items-center
            justify-center
            rounded-full
            text-xs font-medium

            ${
              completed
                ? "bg-success text-white"
                : active
                  ? "bg-ink text-ivory"
                  : "border border-line text-muted"
            }
          `}
        >
          {completed
            ? "✓"
            : number}
        </div>

        <div className="min-w-0">
          <p
            className={`
              text-sm font-medium

              ${
                active ||
                completed
                  ? "text-ink"
                  : "text-muted"
              }
            `}
          >
            {title}
          </p>

          <p className="mt-1 text-xs text-muted">
            {description}
          </p>
        </div>
      </div>
    </div>
  );

  if (
    disabled ||
    !href
  ) {
    return content;
  }

  return (
    <Link href={href}>
      {content}
    </Link>
  );
}