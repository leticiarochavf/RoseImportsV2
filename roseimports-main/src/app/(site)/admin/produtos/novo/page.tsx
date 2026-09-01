import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { ProductForm } from "@/features/admin/product-form";
import type {
  Category,
  OlfactoryFamily,
} from "@/features/catalog/types";

export const metadata: Metadata = {
  title: "Novo produto",
};

export const dynamic = "force-dynamic";

export default async function NovoProdutoPage() {
  await requireAdminUser();

  const supabase = await createClient();

  const [categories, families] = await Promise.all([
  supabase
    .from("categories")
    .select("id, name, slug")
    .eq("active", true)
    .order("sort_order"),

  supabase
    .from("olfactory_families")
    .select("id, name, slug")
    .order("sort_order"),
]);

  return (
    <div className="max-w-4xl">
      {/* VOLTAR */}

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

      {/* CABEÇALHO */}

      <header className="mt-5 border-b border-line pb-6">
        <p className="eyebrow">
          Catálogo
        </p>

        <h1 className="mt-1 text-2xl">
          Novo produto
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Comece pelas informações principais.
          Depois você poderá adicionar preço,
          estoque e imagens do produto.
        </p>
      </header>

      {/* ETAPAS */}

      <div className="mt-6 grid overflow-hidden border border-line bg-line sm:grid-cols-3">
        <Step
          number="1"
          title="Informações"
          description="Dados do produto"
          active
        />

        <Step
          number="2"
          title="Preço e estoque"
          description="Versões e valores"
        />

        <Step
          number="3"
          title="Imagens"
          description="Fotos do produto"
        />
      </div>

      {/* AVISO */}

      <div className="mt-6 border-l-2 border-rose bg-rose-wash/40 px-4 py-3">
        <p className="text-sm font-medium text-ink">
          Etapa 1 de 3
        </p>

        <p className="mt-1 text-xs leading-relaxed text-muted">
          Após salvar estas informações,
          continuaremos para preço, estoque e
          imagens.
        </p>
      </div>

      {/* FORMULÁRIO */}

      <section className="mt-8 border border-line bg-surface p-5 sm:p-7">
        <div className="mb-7">
          <h2 className="text-lg font-medium text-ink">
            Informações do produto
          </h2>

          <p className="mt-1 text-sm text-muted">
            Preencha os dados que identificam o
            produto no catálogo.
          </p>
        </div>

        <ProductForm
          product={null}
          categories={
            (categories.data ??
              []) as Category[]
          }
          families={
            (families.data ??
              []) as OlfactoryFamily[]
          }
        />
      </section>
    </div>
  );
}

function Step({
  number,
  title,
  description,
  active = false,
  completed = false,
}: {
  number: string;
  title: string;
  description: string;
  active?: boolean;
  completed?: boolean;
}) {
  return (
    <div
      className={`
        bg-surface px-4 py-4
        ${
          active
            ? "border-b-2 border-rose sm:border-b-0 sm:border-l-2"
            : ""
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            flex h-7 w-7 shrink-0
            items-center justify-center
            rounded-full
            text-xs font-medium
            ${
              active || completed
                ? "bg-ink text-ivory"
                : "border border-line text-muted"
            }
          `}
        >
          {completed ? "✓" : number}
        </div>

        <div>
          <p
            className={`text-sm font-medium ${
              active
                ? "text-ink"
                : "text-muted"
            }`}
          >
            {title}
          </p>

          <p className="mt-0.5 text-xs text-muted">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}