import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { StatusPill } from "@/components/status-pill";
import { OrderStatusControls } from "@/features/admin/order-status-controls";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from "@/lib/labels";
import type {
  FulfillmentType,
  OrderStatus,
  PaymentMethod,
} from "@/types/database";

export const metadata: Metadata = { title: "Pedido" };
export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  fulfillment_type: FulfillmentType;
  neighborhood: string | null;
  payment_method: PaymentMethod;
  subtotal_cents: number;
  /* Snapshot do cupom: o desconto deste pedido não muda mais, nem se o
     cupom for editado, desativado ou apagado depois. */
  coupon_code_snapshot: string | null;
  coupon_discount_percent_snapshot: number | null;
  discount_cents: number;
  total_cents: number;
  status: OrderStatus;
  paid_at: string | null;
  created_at: string;
  order_items: {
    id: string;
    product_name_snapshot: string;
    variant_label_snapshot: string;
    unit_price_cents_snapshot: number;
    quantity: number;
    subtotal_cents: number;
  }[];
};

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Painel exige perfil de administrador, não só sessão. (§34)
  await requireAdminUser();

  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      `id, order_number, customer_name, fulfillment_type, neighborhood,
       payment_method, subtotal_cents, coupon_code_snapshot,
       coupon_discount_percent_snapshot, discount_cents, total_cents,
       status, paid_at, created_at,
       order_items ( id, product_name_snapshot, variant_label_snapshot,
                     unit_price_cents_snapshot, quantity, subtotal_cents )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const order = data as unknown as OrderRow;

  return (
    <div>
      <Link
        href="/admin/pedidos"
        className="text-xs tracking-[0.12em] text-muted uppercase hover:text-rose"
      >
        ← Pedidos
      </Link>

      <header className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">#{order.order_number}</h1>
          <p className="mt-1 text-xs text-muted">
            Criado em {formatDateTime(order.created_at)}
            {order.paid_at && ` · Pago em ${formatDateTime(order.paid_at)}`}
          </p>
        </div>
        <StatusPill status={order.status} />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <section className="border border-line bg-surface">
            <h2 className="border-b border-line px-5 py-3">
              <span className="eyebrow">Itens</span>
            </h2>

            <ul className="divide-y divide-line">
              {order.order_items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="text-sm">{item.product_name_snapshot}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.variant_label_snapshot} · {item.quantity}x{" "}
                      {formatCents(item.unit_price_cents_snapshot)}
                    </p>
                  </div>
                  <p className="text-sm">{formatCents(item.subtotal_cents)}</p>
                </li>
              ))}
            </ul>

            <div className="flex justify-between border-t border-line px-5 py-4">
              <span className="eyebrow">Subtotal</span>
              <span
                className={
                  order.coupon_code_snapshot
                    ? "text-sm text-muted"
                    : "font-display text-xl"
                }
              >
                {formatCents(order.subtotal_cents)}
              </span>
            </div>

            {order.coupon_code_snapshot && (
              <>
                <div className="flex justify-between px-5 pb-2">
                  <span className="eyebrow">
                    Cupom {order.coupon_code_snapshot}
                    {order.coupon_discount_percent_snapshot !== null &&
                      ` (${order.coupon_discount_percent_snapshot}%)`}
                  </span>
                  <span className="text-sm text-rose">
                    −{formatCents(order.discount_cents)}
                  </span>
                </div>

                <div className="flex justify-between px-5 pb-4">
                  <span className="eyebrow">Total</span>
                  <span className="font-display text-xl">
                    {formatCents(order.total_cents)}
                  </span>
                </div>
              </>
            )}
          </section>

          <p className="mt-3 text-xs text-muted">
            Os valores acima ficaram congelados no momento do pedido. Alterar o
            preço do produto agora não muda este registro.
          </p>

          <section className="mt-8 border border-line bg-surface p-5">
            <h2 className="eyebrow">Mudar status</h2>
            <div className="mt-4">
              <OrderStatusControls orderId={order.id} status={order.status} />
            </div>
          </section>
        </div>

        <aside>
          <section className="border border-line bg-surface p-5">
            <h2 className="eyebrow">Cliente</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-muted">Nome</dt>
                <dd className="mt-0.5">{order.customer_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Recebimento</dt>
                <dd className="mt-0.5">
                  {FULFILLMENT_LABEL[order.fulfillment_type]}
                </dd>
              </div>
              {order.neighborhood && (
                <div>
                  <dt className="text-xs text-muted">Bairro</dt>
                  <dd className="mt-0.5">{order.neighborhood}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted">Pagamento pretendido</dt>
                <dd className="mt-0.5">
                  {PAYMENT_LABEL[order.payment_method]}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
