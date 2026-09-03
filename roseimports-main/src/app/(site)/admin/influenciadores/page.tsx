import Link from "next/link";
import type { Metadata } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { InfluencerRowActions } from "@/features/admin/coupons/influencer-row-actions";
import {
  listInfluencerPerformance,
  listInfluencers,
} from "@/features/admin/coupons/queries";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Influenciadores" };
export const dynamic = "force-dynamic";

export default async function InfluenciadoresPage() {
  await requireAdminUser();

  const [influencers, performance] = await Promise.all([
    listInfluencers(),
    listInfluencerPerformance(),
  ]);

  // Soma de todos os cupons da pessoa, feita pelo banco.
  const byInfluencer = new Map(performance.map((row) => [row.id, row]));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Divulgação</p>

          <h1 className="mt-1 text-2xl">Influenciadores</h1>

          <p className="mt-2 max-w-xl text-sm text-muted">
            Quem divulga a loja. Cada um pode ter vários cupons ao longo do
            tempo, e o desempenho dele é a soma de todos.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/cupons"
            className="inline-flex w-fit items-center justify-center border border-line px-5 py-3 text-xs font-medium tracking-[0.1em] text-ink uppercase transition-colors hover:bg-white"
          >
            Cupons
          </Link>

          <Link
            href="/admin/influenciadores/novo"
            className="inline-flex w-fit items-center justify-center bg-ink px-5 py-3 text-xs font-medium tracking-[0.1em] text-ivory uppercase transition-opacity hover:opacity-90"
          >
            + Novo influenciador
          </Link>
        </div>
      </header>

      {influencers.length > 0 ? (
        <div className="overflow-hidden border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <Th>Nome</Th>
                  <Th>Cupons</Th>
                  <Th>Vendas pagas</Th>
                  <Th>Desconto concedido</Th>
                  <Th>Situação</Th>
                  <Th>Ações</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {influencers.map((influencer) => (
                  <tr
                    key={influencer.id}
                    className={`transition-colors hover:bg-ivory/40 ${
                      influencer.active ? "" : "opacity-55"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/influenciadores/${influencer.id}`}
                        className="font-medium text-ink transition-colors hover:text-rose"
                      >
                        {influencer.name}
                      </Link>

                      {influencer.handle && (
                        <span className="mt-0.5 block text-xs text-muted">
                          {influencer.handle}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-sm text-ink">
                        {influencer.couponsTotal}
                      </p>

                      <p className="mt-0.5 text-xs text-muted">
                        {influencer.couponsActive} ativo
                        {influencer.couponsActive === 1 ? "" : "s"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-sm text-ink">
                        {formatCents(
                          byInfluencer.get(influencer.id)?.paid_net_cents ?? 0,
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-muted">
                        {byInfluencer.get(influencer.id)?.paid_orders ?? 0}{" "}
                        pedido
                        {(byInfluencer.get(influencer.id)?.paid_orders ?? 0) === 1
                          ? ""
                          : "s"}{" "}
                        pago
                        {(byInfluencer.get(influencer.id)?.paid_orders ?? 0) === 1
                          ? ""
                          : "s"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-rose">
                      −
                      {formatCents(
                        byInfluencer.get(influencer.id)?.paid_discount_cents ?? 0,
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-[0.625rem] tracking-[0.08em] uppercase ${
                          influencer.active
                            ? "bg-success/10 text-success"
                            : "bg-ivory-deep text-muted"
                        }`}
                      >
                        {influencer.active ? "Ativo" : "Arquivado"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <InfluencerRowActions
                        influencerId={influencer.id}
                        active={influencer.active}
                        hasCoupons={influencer.couponsTotal > 0}
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
          <p className="text-sm font-medium text-ink">
            Nenhum influenciador cadastrado
          </p>

          <p className="mt-1 text-xs text-muted">
            Cadastre quem divulga a loja para vincular cupons e acompanhar o
            resultado de cada parceria.
          </p>

          <Link
            href="/admin/influenciadores/novo"
            className="mt-4 inline-block text-xs font-medium text-rose hover:underline"
          >
            Cadastrar influenciador
          </Link>
        </div>
      )}
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
