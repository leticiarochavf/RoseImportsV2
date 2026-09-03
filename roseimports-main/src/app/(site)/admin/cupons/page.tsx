import Link from "next/link";
import type { Metadata } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { CouponRowActions } from "@/features/admin/coupons/coupon-row-actions";
import {
  listCoupons,
  listCouponPerformance,
} from "@/features/admin/coupons/queries";
import { COUPON_AVAILABILITY_LABEL } from "@/lib/coupons";
import { formatDateTime } from "@/lib/format";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Cupons" };
export const dynamic = "force-dynamic";

export default async function CuponsPage() {
  await requireAdminUser();

  const [coupons, performance] = await Promise.all([
    listCoupons(),
    listCouponPerformance(),
  ]);

  // O faturamento vem da view; a tela não refaz soma nenhuma.
  const byCoupon = new Map(performance.map((row) => [row.id, row]));

  const receitaPaga = performance.reduce(
    (total, row) => total + row.paid_net_cents,
    0,
  );

  const descontoConcedido = performance.reduce(
    (total, row) => total + row.paid_discount_cents,
    0,
  );

  const ativos = coupons.filter((coupon) => coupon.active).length;
  const disponiveis = coupons.filter(
    (coupon) => coupon.availability === "disponivel",
  ).length;

  /*
    Usos reservados somam todo pré-pedido feito com cupom; confirmados,
    só os que viraram pagamento. A diferença entre os dois é o que ainda
    está em atendimento no WhatsApp.
  */
  const usosReservados = coupons.reduce(
    (total, coupon) => total + coupon.uses_reserved,
    0,
  );

  const usosConfirmados = coupons.reduce(
    (total, coupon) => total + coupon.uses_confirmed,
    0,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Divulgação</p>

          <h1 className="mt-1 text-2xl">Cupons</h1>

          <p className="mt-2 max-w-xl text-sm text-muted">
            Códigos de desconto que o cliente digita no checkout. O valor é
            sempre recalculado pelo servidor a partir da porcentagem daqui.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/influenciadores"
            className="inline-flex w-fit items-center justify-center border border-line px-5 py-3 text-xs font-medium tracking-[0.1em] text-ink uppercase transition-colors hover:bg-white"
          >
            Influenciadores
          </Link>

          <Link
            href="/admin/cupons/novo"
            className="inline-flex w-fit items-center justify-center bg-ink px-5 py-3 text-xs font-medium tracking-[0.1em] text-ivory uppercase transition-opacity hover:opacity-90"
          >
            + Novo cupom
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line lg:grid-cols-3">
        <SummaryItem label="Cupons cadastrados" value={coupons.length} />
        <SummaryItem label="Ativos" value={ativos} />
        <SummaryItem label="Valendo agora" value={disponiveis} />

        <SummaryItem
          label="Pedidos com cupom"
          value={`${usosReservados} (${usosConfirmados} pagos)`}
        />

        <SummaryItem
          label="Vendas pagas com cupom"
          value={formatCents(receitaPaga)}
        />

        <SummaryItem
          label="Desconto concedido"
          value={formatCents(descontoConcedido)}
        />
      </section>

      <p className="text-xs text-muted">
        Faturamento conta só pedido marcado como pago. Pré-pedido ainda em
        atendimento aparece como pendente, nunca somado à receita.
      </p>

      {coupons.length > 0 ? (
        <div className="overflow-hidden border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <Th>Código</Th>
                  <Th>Influenciador</Th>
                  <Th>Validade</Th>
                  <Th>Usos</Th>
                  <Th>Vendas pagas</Th>
                  <Th>Situação</Th>
                  <Th>Ações</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {coupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className={`transition-colors hover:bg-ivory/40 ${
                      coupon.active ? "" : "opacity-55"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/cupons/${coupon.id}`}
                        className="font-medium tracking-[0.08em] text-ink transition-colors hover:text-rose"
                      >
                        {coupon.code}
                      </Link>

                      <span className="mt-0.5 block text-xs text-muted">
                        {coupon.discount_percent}% de desconto
                      </span>
                    </td>

                    <td className="px-4 py-3 text-muted">
                      {coupon.influencer ? (
                        <>
                          {coupon.influencer.name}
                          {coupon.influencer.handle && (
                            <span className="mt-0.5 block text-xs">
                              {coupon.influencer.handle}
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3 text-muted">
                      {coupon.expires_at ? (
                        <span className="text-ink">
                          {formatDateTime(coupon.expires_at)}
                        </span>
                      ) : (
                        "Sem prazo"
                      )}

                      {coupon.starts_at && (
                        <span className="mt-0.5 block text-xs">
                          a partir de {formatDateTime(coupon.starts_at)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-sm text-ink">
                        {coupon.uses_reserved}
                        {coupon.max_uses === null
                          ? " de ilimitado"
                          : ` de ${coupon.max_uses}`}
                      </p>

                      <p className="mt-0.5 text-xs text-muted">
                        {coupon.uses_confirmed} pago
                        {coupon.uses_confirmed === 1 ? "" : "s"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      {(() => {
                        const row = byCoupon.get(coupon.id);

                        if (!row || row.paid_orders === 0) {
                          return (
                            <span className="text-xs text-muted">
                              {row && row.pending_orders > 0
                                ? `${row.pending_orders} aguardando`
                                : "—"}
                            </span>
                          );
                        }

                        return (
                          <div>
                            <p className="text-sm text-ink">
                              {formatCents(row.paid_net_cents)}
                            </p>

                            <p className="mt-0.5 text-xs text-muted">
                              {row.paid_orders} pedido
                              {row.paid_orders === 1 ? "" : "s"} · −
                              {formatCents(row.paid_discount_cents)}
                            </p>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Tag
                          tone={
                            coupon.availability === "disponivel"
                              ? "success"
                              : coupon.availability === "agendado"
                                ? "gold"
                                : coupon.availability === "inativo"
                                  ? "muted"
                                  : "danger"
                          }
                        >
                          {COUPON_AVAILABILITY_LABEL[coupon.availability]}
                        </Tag>

                        {coupon.show_in_showcase && (
                          <Tag tone="rose">Vitrine</Tag>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <CouponRowActions
                        couponId={coupon.id}
                        active={coupon.active}
                        used={coupon.uses_reserved > 0}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-line bg-surface px-5 py-14 text-center">
          <p className="text-sm font-medium text-ink">Nenhum cupom cadastrado</p>

          <p className="mt-1 text-xs text-muted">
            Crie o primeiro código de desconto para começar a acompanhar as
            vendas por influenciador.
          </p>

          <Link
            href="/admin/cupons/novo"
            className="mt-4 inline-block text-xs font-medium text-rose hover:underline"
          >
            Criar cupom
          </Link>
        </div>
      )}
    </div>
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-normal tracking-[0.08em] text-muted uppercase">
      {children}
    </th>
  );
}

function Tag({
  tone,
  children,
}: {
  tone: "muted" | "rose" | "gold" | "success" | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    muted: "bg-ivory-deep text-muted",
    rose: "bg-rose-wash text-rose",
    gold: "bg-gold-soft/30 text-gold",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
  } as const;

  return (
    <span
      className={`px-2 py-0.5 text-[0.625rem] tracking-[0.08em] uppercase ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
