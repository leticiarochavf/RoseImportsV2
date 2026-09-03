import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { site } from "@/lib/config/site";
import { StatusPill } from "@/components/status-pill";
import type { OrderStatus } from "@/types/database";

export const dynamic = "force-dynamic";

type Period = "hoje" | "7dias" | "mes";

const PERIOD_LABEL: Record<Period, string> = {
  hoje: "Hoje",
  "7dias": "Últimos 7 dias",
  mes: "Mês atual",
};

/** Início do período no fuso de São Paulo, convertido para UTC. */
function periodStart(period: Period): Date {
  const now = new Date();
  const local = new Date(
    now.toLocaleString("en-US", { timeZone: site.timezone }),
  );
  const offset = now.getTime() - local.getTime();

  const start = new Date(local);
  start.setHours(0, 0, 0, 0);

  if (period === "7dias") start.setDate(start.getDate() - 6);
  if (period === "mes") start.setDate(1);

  return new Date(start.getTime() + offset);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  // Painel exige perfil de administrador, não só sessão. (§34)
  await requireAdminUser();

  const params = await searchParams;
  const period: Period =
    params.periodo === "7dias" || params.periodo === "mes"
      ? params.periodo
      : "hoje";

  const since = periodStart(period).toISOString();
  const supabase = await createClient();

  const [preorders, paid, recent] = await Promise.all([
    // Pré-pedidos gerados no período, cancelados incluídos: a intenção
    // de compra existiu. (§21)
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),

    // Vendas: paid_at é a fonte da verdade, não o status. Um pedido já
    // entregue continua contando exatamente uma vez. (§28)
    // total_cents, não subtotal: com cupom, o que entrou no caixa é o
    // valor já com desconto.
    supabase
      .from("orders")
      .select("total_cents")
      .not("paid_at", "is", null)
      .gte("paid_at", since),

    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, total_cents, discount_cents, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const preorderCount = preorders.count ?? 0;
  const paidOrders = paid.data ?? [];
  const paidCount = paidOrders.length;
  const revenueCents = paidOrders.reduce((sum, o) => sum + o.total_cents, 0);
  const averageCents = paidCount > 0 ? Math.round(revenueCents / paidCount) : 0;
  const conversion =
    preorderCount > 0 ? (paidCount / preorderCount) * 100 : 0;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1 className="mt-1 text-2xl">Painel</h1>
        </div>

        <nav className="flex gap-1" aria-label="Período">
          {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
            <Link
              key={key}
              href={key === "hoje" ? "/admin" : `/admin?periodo=${key}`}
              aria-current={period === key ? "page" : undefined}
              className={`border px-3.5 py-2 text-xs tracking-[0.1em] uppercase transition-colors ${
                period === key
                  ? "border-ink bg-ink text-ivory"
                  : "border-line bg-surface text-muted hover:border-line-strong"
              }`}
            >
              {PERIOD_LABEL[key]}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Pré-pedidos" value={String(preorderCount)} />
        <Metric label="Pedidos pagos" value={String(paidCount)} />
        <Metric label="Faturamento" value={formatCents(revenueCents)} highlight />
        <Metric label="Ticket médio" value={formatCents(averageCents)} />
        <Metric label="Conversão" value={`${conversion.toFixed(0)}%`} />
      </div>

      <p className="mt-3 text-xs text-muted">
        O faturamento soma apenas o valor dos produtos, já com o desconto de
        cupom aplicado: taxa de entrega e juros de cartão são combinados no
        atendimento e não entram aqui.
      </p>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Pedidos recentes</h2>
          <Link
            href="/admin/pedidos"
            className="text-xs tracking-[0.12em] text-rose uppercase hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {recent.data && recent.data.length > 0 ? (
          <div className="mt-4 overflow-x-auto border border-line bg-surface">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <Th>Pedido</Th>
                  <Th>Cliente</Th>
                  <Th>Data</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.data.map((order) => (
                  <tr key={order.id} className="hover:bg-ivory/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="text-rose hover:underline"
                      >
                        #{order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{order.customer_name}</td>
                    <td className="px-4 py-3 text-muted">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCents(order.total_cents)}

                      {order.discount_cents > 0 && (
                        <span className="mt-0.5 block text-xs text-rose">
                          cupom −{formatCents(order.discount_cents)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={order.status as OrderStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 border border-line bg-surface px-5 py-10 text-center text-sm text-muted">
            Nenhum pedido ainda. Os pré-pedidos gerados pelo site aparecem aqui.
          </p>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border bg-surface px-5 py-6 ${
        highlight ? "border-rose-soft" : "border-line"
      }`}
    >
      <p className="eyebrow" style={{ fontSize: "0.5625rem" }}>
        {label}
      </p>
      <p className="mt-2 font-display text-2xl">{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-normal tracking-[0.1em] text-muted uppercase">
      {children}
    </th>
  );
}
