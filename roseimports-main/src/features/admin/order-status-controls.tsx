"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/features/admin/actions";
import { NEXT_STATUSES, ORDER_STATUS_LABEL } from "@/lib/labels";
import type { OrderStatus } from "@/types/database";

/**
 * Só oferece as transições que o banco aceita. Marcar como pago pede
 * confirmação porque é a ação que mexe no estoque. (§23)
 */
export function OrderStatusControls({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { ok: boolean; text: string } | null
  >(null);

  const options = NEXT_STATUSES[status];

  function change(next: OrderStatus) {
    if (
      next === "pago" &&
      !window.confirm(
        "Marcar como pago vai dar baixa no estoque de todos os itens deste pedido. Confirmar?",
      )
    ) {
      return;
    }

    if (
      next === "cancelado" &&
      !window.confirm("Cancelar este pedido? Essa ação não pode ser desfeita.")
    ) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next);
      setFeedback(
        result.ok
          ? { ok: true, text: result.message }
          : { ok: false, text: result.error },
      );
    });
  }

  return (
    <div>
      {options.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isPay = option === "pago";
            const isCancel = option === "cancelado";

            return (
              <button
                key={option}
                type="button"
                disabled={pending}
                onClick={() => change(option)}
                className={`px-5 py-2.5 text-xs tracking-[0.12em] uppercase transition-opacity disabled:opacity-50 ${
                  isPay
                    ? "bg-ink text-ivory hover:opacity-85"
                    : isCancel
                      ? "border border-danger/40 text-danger hover:bg-danger/5"
                      : "border border-line-strong hover:border-rose hover:text-rose"
                }`}
              >
                {isPay
                  ? "Marcar como pago"
                  : isCancel
                    ? "Cancelar pedido"
                    : ORDER_STATUS_LABEL[option]}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">
          {status === "cancelado"
            ? "Pedido cancelado. Não há mais mudanças possíveis."
            : "Pedido concluído. Não há mais mudanças possíveis."}
        </p>
      )}

      {pending && (
        <p className="mt-3 text-xs text-muted" role="status">
          Atualizando…
        </p>
      )}

      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`mt-3 border px-4 py-2.5 text-sm ${
            feedback.ok
              ? "border-success/30 bg-success/5 text-success"
              : "border-danger/30 bg-danger/5 text-danger"
          }`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
