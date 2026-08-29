"use client";

import { useState, useTransition } from "react";
import { deleteVariant, saveVariant } from "@/features/admin/actions";
import { ConfirmDeleteButton } from "@/features/admin/confirm-delete-button";
import { centsToInput, formatCents } from "@/lib/money";
import { stockLabel } from "@/lib/stock";
import type { ProductVariant } from "@/types/database";

export function VariantManager({
  productId,
  variants,
}: {
  productId: string;
  variants: ProductVariant[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<
    { ok: boolean; text: string } | null
  >(null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">Versões</h2>
        {!creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
            className="text-xs tracking-[0.12em] text-rose uppercase hover:underline"
          >
            + Nova versão
          </button>
        )}
      </div>

      <p className="mt-1.5 text-xs text-muted">
        Cada versão tem preço e estoque próprios. Decants entram aqui, não como
        produto separado.
      </p>

      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`mt-4 border px-4 py-2.5 text-sm ${
            feedback.ok
              ? "border-success/30 bg-success/5 text-success"
              : "border-danger/30 bg-danger/5 text-danger"
          }`}
        >
          {feedback.text}
        </p>
      )}

      {creating && (
        <div className="mt-5 border border-rose-soft bg-rose-wash/40 p-5">
          <VariantForm
            productId={productId}
            variant={null}
            onDone={(result) => {
              setFeedback(result);
              if (result.ok) setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      <div className="mt-5 space-y-3">
        {variants.length === 0 && !creating && (
          <p className="border border-line bg-surface px-5 py-8 text-center text-sm text-muted">
            Nenhuma versão ainda. O produto só aparece no catálogo depois de ter
            pelo menos uma.
          </p>
        )}

        {variants.map((variant) =>
          editing === variant.id ? (
            <div key={variant.id} className="border border-rose-soft bg-rose-wash/40 p-5">
              <VariantForm
                productId={productId}
                variant={variant}
                onDone={(result) => {
                  setFeedback(result);
                  if (result.ok) setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            </div>
          ) : (
            <div
              key={variant.id}
              className={`flex flex-wrap items-center justify-between gap-4 border border-line bg-surface px-5 py-4 ${
                variant.active ? "" : "opacity-55"
              }`}
            >
              <div>
                <p className="text-sm">
                  {variant.label}
                  {variant.variant_type === "decant" && (
                    <span className="ml-2 bg-ivory-deep px-1.5 py-0.5 text-[0.625rem] tracking-[0.1em] uppercase">
                      Decant
                    </span>
                  )}
                  {!variant.active && (
                    <span className="ml-2 text-xs text-muted">· inativa</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatCents(variant.price_cents)} · estoque{" "}
                  {variant.stock_quantity} ({stockLabel(variant.stock_quantity)})
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(variant.id);
                    setCreating(false);
                  }}
                  className="text-xs tracking-[0.12em] text-rose uppercase hover:underline"
                >
                  Editar
                </button>
                <ConfirmDeleteButton
                  idleLabel="Remover"
                  confirmLabel="Confirmar remoção"
                  onConfirm={() => deleteVariant(productId, variant.id)}
                  onResult={(result) =>
                    setFeedback(
                      result.ok
                        ? { ok: true, text: result.message ?? "Versão removida." }
                        : { ok: false, text: result.error ?? "Não foi possível remover." },
                    )
                  }
                />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

type Feedback = { ok: boolean; text: string };

function VariantForm({
  productId,
  variant,
  onDone,
  onCancel,
}: {
  productId: string;
  variant: ProductVariant | null;
  onDone: (result: Feedback) => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveVariant(productId, variant?.id ?? null, formData);
      onDone(
        result.ok
          ? { ok: true, text: result.message }
          : { ok: false, text: result.error },
      );
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="label" className="eyebrow">
            Nome da versão
          </label>
          <input
            id="label"
            name="label"
            required
            maxLength={60}
            placeholder="100 ml"
            defaultValue={variant?.label ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="volumeMl" className="eyebrow">
            Volume em ml
          </label>
          <input
            id="volumeMl"
            name="volumeMl"
            type="number"
            min={1}
            placeholder="100"
            defaultValue={variant?.volume_ml ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="variantType" className="eyebrow">
            Tipo
          </label>
          <select
            id="variantType"
            name="variantType"
            defaultValue={variant?.variant_type ?? "full"}
            className={inputClass}
          >
            <option value="full">Frasco cheio</option>
            <option value="decant">Decant</option>
          </select>
        </div>

        <div>
          <label htmlFor="price" className="eyebrow">
            Preço (R$)
          </label>
          <input
            id="price"
            name="price"
            required
            inputMode="decimal"
            placeholder="249,90"
            defaultValue={variant ? centsToInput(variant.price_cents) : ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="stockQuantity" className="eyebrow">
            Estoque
          </label>
          <input
            id="stockQuantity"
            name="stockQuantity"
            type="number"
            min={0}
            max={9999}
            required
            defaultValue={variant?.stock_quantity ?? 0}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="sortOrder" className="eyebrow">
            Ordem
          </label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            max={999}
            defaultValue={variant?.sort_order ?? 0}
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          name="active"
          defaultChecked={variant?.active ?? true}
          className="h-4 w-4 accent-[#a85f72]"
        />
        <span className="text-sm">Versão ativa</span>
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink px-6 py-2.5 text-xs tracking-[0.14em] text-ivory uppercase disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar versão"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-xs tracking-[0.14em] text-muted uppercase hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "mt-2 w-full border border-line bg-surface px-3.5 py-2.5 text-sm focus:border-rose focus:outline-none";
