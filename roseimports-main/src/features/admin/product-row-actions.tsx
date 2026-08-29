"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteProduct,
  toggleProductActive,
  toggleProductFlag,
} from "@/features/admin/actions";
import { ConfirmDeleteButton } from "@/features/admin/confirm-delete-button";

export function ProductRowActions({
  productId,
  active,
  featured,
}: {
  productId: string;
  active: boolean;
  featured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3 whitespace-nowrap">
        <Link
          href={`/admin/produtos/${productId}`}
          className="text-xs tracking-[0.1em] text-rose uppercase hover:underline"
        >
          Editar
        </Link>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void toggleProductFlag(productId, "featured", !featured);
            })
          }
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink disabled:opacity-50"
        >
          {featured ? "Tirar destaque" : "Destacar"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void toggleProductActive(productId, !active);
            })
          }
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink disabled:opacity-50"
        >
          {active ? "Desativar" : "Ativar"}
        </button>

        <ConfirmDeleteButton
          idleLabel="Excluir"
          onConfirm={() => deleteProduct(productId)}
          onResult={(result) =>
            setError(result.ok ? null : (result.error ?? "Não foi possível excluir."))
          }
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
