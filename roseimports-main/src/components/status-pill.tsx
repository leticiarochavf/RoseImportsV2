import { ORDER_STATUS_LABEL } from "@/lib/labels";
import type { OrderStatus } from "@/types/database";

const STYLES: Record<OrderStatus, string> = {
  novo: "bg-rose-wash text-rose",
  em_atendimento: "bg-ivory-deep text-ink-soft",
  pago: "bg-success/10 text-success",
  entregue: "bg-success/10 text-success",
  retirado: "bg-success/10 text-success",
  cancelado: "bg-danger/10 text-danger",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block px-2.5 py-1 text-xs ${STYLES[status]}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
