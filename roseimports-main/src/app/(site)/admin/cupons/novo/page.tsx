import Link from "next/link";
import type { Metadata } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { CouponForm } from "@/features/admin/coupons/coupon-form";
import { listActiveInfluencerOptions } from "@/features/admin/coupons/queries";

export const metadata: Metadata = { title: "Novo cupom" };
export const dynamic = "force-dynamic";

export default async function NovoCupomPage() {
  await requireAdminUser();

  const influencers = await listActiveInfluencerOptions();

  return (
    <div className="space-y-6">
      <header className="border-b border-line pb-6">
        <Link
          href="/admin/cupons"
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink"
        >
          ← Cupons
        </Link>

        <h1 className="mt-3 text-2xl">Novo cupom</h1>

        <p className="mt-2 max-w-xl text-sm text-muted">
          O desconto é sempre calculado pelo servidor a partir da porcentagem
          definida aqui.
        </p>
      </header>

      <div className="border border-line bg-surface p-6">
        <CouponForm coupon={null} influencers={influencers} />
      </div>
    </div>
  );
}
