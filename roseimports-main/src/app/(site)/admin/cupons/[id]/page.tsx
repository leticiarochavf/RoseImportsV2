import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAdminUser } from "@/lib/auth/admin";
import { CouponForm } from "@/features/admin/coupons/coupon-form";
import {
  getCoupon,
  getCouponPerformance,
  listActiveInfluencerOptions,
  listOrdersByCoupon,
} from "@/features/admin/coupons/queries";
import { COUPON_AVAILABILITY_LABEL } from "@/lib/coupons";
import { formatDateTime } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/labels";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Editar cupom" };
export const dynamic = "force-dynamic";

export default async function EditarCupomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();

  const { id } = await params;

  const [coupon, influencers, performance, orders] = await Promise.all([
    getCoupon(id),
    listActiveInfluencerOptions(),
    getCouponPerformance(id),
    listOrdersByCoupon(id),
  ]);

  if (!coupon) notFound();

  /*
    Um influenciador arquivado sai da lista de escolha, mas se este cupom
    é dele o nome precisa continuar aparecendo — senão salvar o cupom
    apagaria a atribuição sem ninguém perceber.
  */
  const options = coupon.influencer
    ? [
        coupon.influencer,
        ...influencers.filter(
          (influencer) => influencer.id !== coupon.influencer?.id,
        ),
      ]
    : influencers;

  return (
    <div className="space-y-6">
      <header className="border-b border-line pb-6">
        <Link
          href="/admin/cupons"
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink"
        >
          ← Cupons
        </Link>

        <h1 className="mt-3 font-display text-2xl tracking-[0.08em]">
          {coupon.code}
        </h1>

        <p className="mt-2 text-sm text-muted">
          {COUPON_AVAILABILITY_LABEL[coupon.availability]} ·{" "}
          {coupon.discount_percent}% de desconto · criado em{" "}
          {formatDateTime(coupon.created_at)}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line lg:grid-cols-3">
        <SummaryItem
          label="Usos (de limite)"
          value={`${coupon.uses_reserved} de ${
            coupon.max_uses === null ? "ilimitado" : coupon.max_uses
          }`}
        />

        <SummaryItem
          label="Pedidos pagos"
          value={performance?.paid_orders ?? 0}
        />

        <SummaryItem
          label="Aguardando pagamento"
          value={performance?.pending_orders ?? 0}
        />

        <SummaryItem
          label="Vendas pagas (bruto)"
          value={formatCents(performance?.paid_gross_cents ?? 0)}
        />

        <SummaryItem
          label="Desconto concedido"
          value={formatCents(performance?.paid_discount_cents ?? 0)}
        />

        <SummaryItem
          label="Recebido pela loja"
          value={formatCents(performance?.paid_net_cents ?? 0)}
        />
      </section>

      <p className="text-xs text-muted">
        Bruto é o valor antes do desconto; recebido é o que a loja ficou. A
        diferença entre os dois é o desconto concedido. Só pedido pago entra
        nessa conta.
      </p>

      <section className="overflow-hidden border border-line bg-surface">
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-sm font-medium text-ink">Pedidos com este cupom</h2>

          <p className="mt-1 text-xs text-muted">
            Os 200 mais recentes. O desconto mostrado é o que foi gravado no
            pedido, não o percentual atual do cupom.
          </p>
        </div>

        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <Th>Pedido</Th>
                  <Th>Data</Th>
                  <Th>Situação</Th>
                  <Th>Desconto</Th>
                  <Th>Total</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-ivory/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="font-medium text-ink hover:text-rose"
                      >
                        #{order.order_number}
                      </Link>

                      <span className="mt-0.5 block text-xs text-muted">
                        {order.customer_name}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-muted">
                      {formatDateTime(order.created_at)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-[0.625rem] tracking-[0.08em] uppercase ${
                          order.paid_at
                            ? "bg-success/10 text-success"
                            : order.status === "cancelado"
                              ? "bg-danger/10 text-danger"
                              : "bg-ivory-deep text-muted"
                        }`}
                      >
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-rose">
                      −{formatCents(order.discount_cents)}

                      {order.coupon_discount_percent_snapshot !== null && (
                        <span className="mt-0.5 block text-xs text-muted">
                          {order.coupon_discount_percent_snapshot}% sobre{" "}
                          {formatCents(order.subtotal_cents)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-ink">
                      {formatCents(order.total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-xs text-muted">
            Nenhum pedido usou este cupom ainda.
          </p>
        )}
      </section>

      <div className="border border-line bg-surface p-6">
        <CouponForm coupon={coupon} influencers={options} />
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-normal tracking-[0.08em] text-muted uppercase">
      {children}
    </th>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-surface px-4 py-4">
      <p className="text-xs text-muted">{label}</p>

      <p className="mt-1 text-xl font-medium text-ink">{value}</p>
    </div>
  );
}
