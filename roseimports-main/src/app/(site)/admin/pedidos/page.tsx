import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { StatusPill } from "@/components/status-pill";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/labels";
import type { FulfillmentType, OrderStatus, PaymentMethod } from "@/types/database";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "novo", label: "Novos" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "pago", label: "Pagos" },
  { value: "entregue", label: "Entregues" },
  { value: "retirado", label: "Retirados" },
  { value: "cancelado", label: "Cancelados" },
];

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Painel exige perfil de administrador, não só sessão. (§34)
  await requireAdminUser();

  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, fulfillment_type, neighborhood, payment_method, subtotal_cents, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status as OrderStatus);

  const { data: orders, error } = await query;

  return (
    <div>
      <header>
        <p className="eyebrow">Operação</p>
        <h1 className="mt-1 text-2xl">Pedidos</h1>
      </header>

      <nav className="mt-6 flex flex-wrap gap-1.5" aria-label="Filtrar por status">
        {FILTERS.map((filter) => {
          const active = (status ?? "") === filter.value;
          return (
            <Link
              key={filter.label}
              href={
                filter.value ? `/admin/pedidos?status=${filter.value}` : "/admin/pedidos"
              }
              aria-current={active ? "page" : undefined}
              className={`border px-3.5 py-2 text-xs tracking-[0.1em] uppercase transition-colors ${
                active
                  ? "border-ink bg-ink text-ivory"
                  : "border-line bg-surface text-muted hover:border-line-strong"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {error && (
        <p role="alert" className="mt-6 text-sm text-danger">
          Não foi possível carregar os pedidos. Recarregue a página.
        </p>
      )}

      {orders && orders.length > 0 ? (
        <div className="mt-6 overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Pedido</Th>
                <Th>Data</Th>
                <Th>Cliente</Th>
                <Th>Recebimento</Th>
                <Th>Pagamento</Th>
                <Th>Total</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-ivory/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="text-rose hover:underline"
                    >
                      #{order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDateTime(order.created_at)}
                  </td>
                  <td className="px-4 py-3">{order.customer_name}</td>
                  <td className="px-4 py-3">
                    {FULFILLMENT_LABEL[order.fulfillment_type as FulfillmentType]}
                    {order.neighborhood && (
                      <span className="block text-xs text-muted">
                        {order.neighborhood}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {PAYMENT_LABEL[order.payment_method as PaymentMethod]}
                  </td>
                  <td className="px-4 py-3">{formatCents(order.subtotal_cents)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={order.status as OrderStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && (
          <p className="mt-6 border border-line bg-surface px-5 py-12 text-center text-sm text-muted">
            {status
              ? `Nenhum pedido com status "${ORDER_STATUS_LABEL[status as OrderStatus] ?? status}".`
              : "Nenhum pedido ainda. Os pré-pedidos gerados pelo site aparecem aqui."}
          </p>
        )
      )}
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
