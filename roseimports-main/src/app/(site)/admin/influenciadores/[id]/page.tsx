import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAdminUser } from "@/lib/auth/admin";
import { InfluencerForm } from "@/features/admin/coupons/influencer-form";
import { getInfluencer, listCoupons } from "@/features/admin/coupons/queries";
import { COUPON_AVAILABILITY_LABEL } from "@/lib/coupons";

export const metadata: Metadata = { title: "Editar influenciador" };
export const dynamic = "force-dynamic";

export default async function EditarInfluenciadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();

  const { id } = await params;

  const [influencer, coupons] = await Promise.all([
    getInfluencer(id),
    listCoupons(),
  ]);

  if (!influencer) notFound();

  const ownCoupons = coupons.filter(
    (coupon) => coupon.influencer_id === influencer.id,
  );

  return (
    <div className="space-y-6">
      <header className="border-b border-line pb-6">
        <Link
          href="/admin/influenciadores"
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink"
        >
          ← Influenciadores
        </Link>

        <h1 className="mt-3 text-2xl">{influencer.name}</h1>

        {influencer.handle && (
          <p className="mt-1 text-sm text-muted">{influencer.handle}</p>
        )}
      </header>

      <div className="border border-line bg-surface p-6">
        <InfluencerForm influencer={influencer} />
      </div>

      <section className="border border-line bg-surface p-6">
        <h2 className="text-sm font-medium text-ink">Cupons desta parceria</h2>

        {ownCoupons.length > 0 ? (
          <ul className="mt-4 divide-y divide-line">
            {ownCoupons.map((coupon) => (
              <li
                key={coupon.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3"
              >
                <Link
                  href={`/admin/cupons/${coupon.id}`}
                  className="tracking-[0.08em] text-ink hover:text-rose"
                >
                  {coupon.code}
                </Link>

                <span className="text-xs text-muted">
                  {coupon.discount_percent}% ·{" "}
                  {COUPON_AVAILABILITY_LABEL[coupon.availability]} ·{" "}
                  {coupon.uses_reserved} uso
                  {coupon.uses_reserved === 1 ? "" : "s"} (
                  {coupon.uses_confirmed} pago
                  {coupon.uses_confirmed === 1 ? "" : "s"})
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted">
            Nenhum cupom vinculado ainda.{" "}
            <Link href="/admin/cupons/novo" className="text-rose hover:underline">
              Criar cupom
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}
