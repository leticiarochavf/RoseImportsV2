import type { Metadata } from "next";
import Link from "next/link";

import { BulkProductImport } from "@/features/admin/bulk-products/bulk-product-import";
import { requireAdminUser } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Cadastro em lote" };
export const dynamic = "force-dynamic";

export default async function CadastroEmLotePage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1 className="mt-1 text-2xl">Cadastro em lote</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Analise, revise e cadastre produtos mantendo pendências comerciais inativas até a conferência manual.
          </p>
        </div>
        <Link href="/admin/produtos" className="inline-flex w-fit items-center justify-center border border-line px-4 py-3 text-xs font-medium tracking-[0.1em] text-ink uppercase hover:bg-white">
          Voltar para produtos
        </Link>
      </header>

      <BulkProductImport />
    </div>
  );
}
