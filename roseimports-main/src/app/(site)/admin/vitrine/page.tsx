import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminUser } from "@/lib/auth/admin";
import { ShowcaseOrder } from "@/features/admin/showcase-order";
import { getShowcaseProducts } from "@/features/catalog/queries";

export const metadata: Metadata = { title: "Vitrine" };
export const dynamic = "force-dynamic";

export default async function VitrinePage() {
  await requireAdminUser();

  const products = await getShowcaseProducts();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Catálogo</p>

          <h1 className="mt-1 text-2xl">Vitrine</h1>

          <p className="mt-2 max-w-xl text-sm text-muted">
            Defina a ordem em que os produtos aparecem no catálogo. É essa
            ordem que o cliente vê em “Padrão da loja”, antes de escolher
            qualquer outra ordenação.
          </p>
        </div>

        <Link
          href="/catalogo"
          target="_blank"
          rel="noopener noreferrer"
          className="
            inline-flex w-fit items-center justify-center
            border border-line-strong bg-surface px-4 py-2.5
            text-xs font-medium tracking-[0.08em] uppercase
            transition hover:border-ink
          "
        >
          Ver vitrine
        </Link>
      </header>

      <ShowcaseOrder products={products} />
    </div>
  );
}
