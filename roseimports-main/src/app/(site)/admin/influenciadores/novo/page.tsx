import Link from "next/link";
import type { Metadata } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { InfluencerForm } from "@/features/admin/coupons/influencer-form";

export const metadata: Metadata = { title: "Novo influenciador" };
export const dynamic = "force-dynamic";

export default async function NovoInfluenciadorPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <header className="border-b border-line pb-6">
        <Link
          href="/admin/influenciadores"
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink"
        >
          ← Influenciadores
        </Link>

        <h1 className="mt-3 text-2xl">Novo influenciador</h1>
      </header>

      <div className="border border-line bg-surface p-6">
        <InfluencerForm influencer={null} />
      </div>
    </div>
  );
}
