import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { ProductForm } from "@/features/admin/product-form";
import type { Category, OlfactoryFamily } from "@/features/catalog/types";

export const metadata: Metadata = { title: "Novo produto" };
export const dynamic = "force-dynamic";

export default async function NovoProdutoPage() {
  // Painel exige perfil de administrador, não só sessão. (§34)
  await requireAdminUser();

  const supabase = await createClient();

  const [categories, families] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("sort_order"),
    supabase
      .from("olfactory_families")
      .select("id, name, slug")
      .order("sort_order"),
  ]);

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/produtos"
        className="text-xs tracking-[0.12em] text-muted uppercase hover:text-rose"
      >
        ← Produtos
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl">Novo produto</h1>
        <p className="mt-1.5 text-sm text-muted">
          Cadastre as informações principais. As versões e imagens você adiciona
          na tela seguinte.
        </p>
      </header>

      <div className="mt-8">
        <ProductForm
          product={null}
          categories={(categories.data ?? []) as Category[]}
          families={(families.data ?? []) as OlfactoryFamily[]}
        />
      </div>
    </div>
  );
}
