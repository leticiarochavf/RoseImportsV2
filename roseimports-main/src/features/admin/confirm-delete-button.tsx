"use client";

import { useTransition, useState } from "react";

export type DeleteResult = { ok: boolean; error?: string; message?: string };

/**
 * Exclusão em duas etapas: o primeiro clique "arma" a ação e mostra
 * "Confirmar exclusão" + "Cancelar". Só o segundo clique executa.
 * Substitui o window.confirm por uma confirmação visível no próprio lugar.
 */
export function ConfirmDeleteButton({
  onConfirm,
  idleLabel = "Excluir",
  confirmLabel = "Confirmar exclusão",
  cancelLabel = "Cancelar",
  className = "",
  onResult,
}: {
  onConfirm: () => Promise<DeleteResult>;
  idleLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  className?: string;
  onResult?: (result: DeleteResult) => void;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={`text-xs tracking-[0.1em] text-muted uppercase hover:text-danger ${className}`}
      >
        {idleLabel}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await onConfirm();
            onResult?.(result);
            // Em caso de sucesso a linha some via revalidate; se continuar
            // montado (erro), desarma para não travar em modo confirmação.
            setArmed(false);
          })
        }
        className="text-xs tracking-[0.1em] text-danger uppercase hover:underline disabled:opacity-50"
      >
        {pending ? "Excluindo…" : confirmLabel}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setArmed(false)}
        className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink disabled:opacity-50"
      >
        {cancelLabel}
      </button>
    </span>
  );
}
