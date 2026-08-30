"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  deleteVariant,
  saveVariant,
} from "@/features/admin/actions";

import { ConfirmDeleteButton } from "@/features/admin/confirm-delete-button";

import {
  centsToInput,
  formatCents,
} from "@/lib/money";

import { stockLabel } from "@/lib/stock";

import type { ProductVariant } from "@/types/database";

type Feedback = {
  ok: boolean;
  text: string;
};

export function VariantManager({
  productId,
  variants,
  onboarding = false,
}: {
  productId: string;
  variants: ProductVariant[];
  onboarding?: boolean;
}) {
  const router = useRouter();

  const [editing, setEditing] =
    useState<string | null>(null);

  /*
   * Durante um cadastro novo,
   * o formulário já abre automaticamente.
   */
  const [creating, setCreating] =
    useState(
      onboarding &&
        variants.length === 0,
    );

  const [feedback, setFeedback] =
    useState<Feedback | null>(null);

  return (
    <div>
      {/* CABEÇALHO */}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-ink">
            Preço e estoque
          </h2>

          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-muted">
            Informe o volume, preço e
            quantidade disponível do produto.
          </p>
        </div>

        {!creating && !onboarding && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditing(null);
              setFeedback(null);
            }}
            className="
              text-xs font-medium
              tracking-[0.1em]
              text-rose uppercase
              hover:underline
            "
          >
            + Nova versão
          </button>
        )}
      </div>

      {/* FEEDBACK */}

      {feedback && (
        <p
          role={
            feedback.ok
              ? "status"
              : "alert"
          }
          className={`
            mt-5 border px-4 py-3 text-sm
            ${
              feedback.ok
                ? "border-success/30 bg-success/5 text-success"
                : "border-danger/30 bg-danger/5 text-danger"
            }
          `}
        >
          {feedback.text}
        </p>
      )}

      {/* NOVA VERSÃO */}

      {creating && (
        <div className="mt-6 border border-line bg-ivory/30 p-5 sm:p-6">
          {onboarding && (
            <div className="mb-6 border-b border-line pb-5">
              <p className="text-sm font-medium text-ink">
                Preço e estoque do produto
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted">
                Preencha os dados abaixo.
                Depois você seguirá
                automaticamente para as
                imagens.
              </p>
            </div>
          )}

          <VariantForm
            productId={productId}
            variant={null}
            onboarding={onboarding}
            onDone={(result) => {
              setFeedback(result);

              if (!result.ok) {
                return;
              }

              setCreating(false);

              if (onboarding) {
                router.push(
                  `/admin/produtos/${productId}?etapa=imagens`,
                );

                router.refresh();
              }
            }}
            onCancel={() =>
              setCreating(false)
            }
          />
        </div>
      )}

      {/* VERSÕES EXISTENTES */}

      <div className="mt-6 space-y-3">
        {variants.length === 0 &&
          !creating && (
            <div className="border border-line bg-surface px-5 py-10 text-center">
              <p className="text-sm font-medium text-ink">
                Preço e estoque ainda não
                cadastrados
              </p>

              <p className="mt-1 text-xs text-muted">
                Cadastre as informações de
                venda deste produto.
              </p>

              <button
                type="button"
                onClick={() =>
                  setCreating(true)
                }
                className="mt-4 text-xs font-medium text-rose hover:underline"
              >
                Cadastrar preço e estoque
              </button>
            </div>
          )}

        {variants.map((variant) =>
          editing === variant.id ? (
            <div
              key={variant.id}
              className="border border-line bg-ivory/30 p-5 sm:p-6"
            >
              <VariantForm
                productId={productId}
                variant={variant}
                onDone={(result) => {
                  setFeedback(result);

                  if (result.ok) {
                    setEditing(null);
                    router.refresh();
                  }
                }}
                onCancel={() =>
                  setEditing(null)
                }
              />
            </div>
          ) : (
            <div
              key={variant.id}
              className={`
                flex flex-col gap-4
                border border-line
                bg-surface
                px-5 py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
                ${
                  variant.active
                    ? ""
                    : "opacity-55"
                }
              `}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-ink">
                    {variant.label}
                  </p>

                  {!variant.active && (
                    <span className="text-xs text-muted">
                      Inativa
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-muted">
                  {formatCents(
                    variant.price_cents,
                  )}{" "}
                  ·{" "}
                  {variant.stock_quantity} un.
                  {" · "}
                  {stockLabel(
                    variant.stock_quantity,
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(
                      variant.id,
                    );

                    setCreating(false);
                    setFeedback(null);
                  }}
                  className="text-xs font-medium tracking-[0.08em] text-rose uppercase hover:underline"
                >
                  Editar
                </button>

                <ConfirmDeleteButton
                  idleLabel="Remover"
                  confirmLabel="Confirmar remoção"
                  onConfirm={() =>
                    deleteVariant(
                      productId,
                      variant.id,
                    )
                  }
                  onResult={(result) => {
                    setFeedback(
                      result.ok
                        ? {
                            ok: true,

                            text:
                              result.message ??
                              "Versão removida.",
                          }
                        : {
                            ok: false,

                            text:
                              result.error ??
                              "Não foi possível remover.",
                          },
                    );

                    if (result.ok) {
                      router.refresh();
                    }
                  }}
                />
              </div>
            </div>
          ),
        )}
      </div>

      {/* CONTINUAR */}

      {onboarding &&
        variants.length > 0 &&
        !creating && (
          <div className="mt-7 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">
                Preço e estoque cadastrados
              </p>

              <p className="mt-1 text-xs text-muted">
                Agora adicione as fotos do
                produto.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/admin/produtos/${productId}?etapa=imagens`,
                )
              }
              className="
                bg-ink
                px-6 py-3
                text-xs font-medium
                tracking-[0.1em]
                text-ivory uppercase
                transition-opacity
                hover:opacity-90
              "
            >
              Continuar para imagens →
            </button>
          </div>
        )}
    </div>
  );
}

/* =============================================================
   FORMULÁRIO
============================================================= */

function VariantForm({
  productId,
  variant,
  onboarding = false,
  onDone,
  onCancel,
}: {
  productId: string;

  variant:
    | ProductVariant
    | null;

  onboarding?: boolean;

  onDone: (
    result: Feedback,
  ) => void;

  onCancel: () => void;
}) {
  const [pending, startTransition] =
    useTransition();

  function handleSubmit(
    formData: FormData,
  ) {
    startTransition(async () => {
      const result =
        await saveVariant(
          productId,
          variant?.id ?? null,
          formData,
        );

      onDone(
        result.ok
          ? {
              ok: true,
              text: result.message,
            }
          : {
              ok: false,
              text: result.error,
            },
      );
    });
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-6"
    >
      {/*
       * Agora são somente 4 campos.
       * 2 por linha no desktop.
       */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* NOME DA VERSÃO */}

        <Field
          label="Nome da versão"
          htmlFor="label"
          hint="Ex.: 100 ml"
        >
          <input
            id="label"
            name="label"
            required
            maxLength={60}
            placeholder="100 ml"
            defaultValue={
              variant?.label ?? ""
            }
            className={inputClass}
          />
        </Field>

        {/* VOLUME */}

        <Field
          label="Volume"
          htmlFor="volumeMl"
          hint="Informe somente o número."
        >
          <div className="relative">
            <input
              id="volumeMl"
              name="volumeMl"
              type="number"
              min={1}
              placeholder="100"
              defaultValue={
                variant?.volume_ml ?? ""
              }
              className={`${inputClass} pr-12`}
            />

            <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-muted">
              mL
            </span>
          </div>
        </Field>

        {/* PREÇO */}

        <Field
          label="Preço"
          htmlFor="price"
        >
          <div className="relative">
            <span className="pointer-events-none absolute bottom-2.5 left-3 text-xs text-muted">
              R$
            </span>

            <input
              id="price"
              name="price"
              required
              inputMode="decimal"
              placeholder="249,90"
              defaultValue={
                variant
                  ? centsToInput(
                      variant.price_cents,
                    )
                  : ""
              }
              className={`${inputClass} pl-10`}
            />
          </div>
        </Field>

        {/* ESTOQUE */}

        <Field
          label="Quantidade em estoque"
          htmlFor="stockQuantity"
        >
          <input
            id="stockQuantity"
            name="stockQuantity"
            type="number"
            min={0}
            max={9999}
            required
            defaultValue={
              variant?.stock_quantity ??
              0
            }
            className={inputClass}
          />
        </Field>
      </div>

      {/* ATIVA */}

      <label className="flex cursor-pointer gap-3 border border-line bg-surface px-4 py-3">
        <input
          type="checkbox"
          name="active"
          defaultChecked={
            variant?.active ?? true
          }
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#a85f72]"
        />

        <span>
          <span className="block text-sm font-medium text-ink">
            Disponível para venda
          </span>

          <span className="mt-0.5 block text-xs text-muted">
            Desmarque caso essa versão não
            deva aparecer no catálogo.
          </span>
        </span>
      </label>

      {/* AÇÕES */}

      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <button
          type="submit"
          disabled={pending}
          className="
            bg-ink
            px-6 py-3
            text-xs font-medium
            tracking-[0.1em]
            text-ivory uppercase
            transition-opacity
            hover:opacity-90
            disabled:opacity-50
          "
        >
          {pending
            ? "Salvando…"
            : onboarding &&
                !variant
              ? "Continuar para imagens →"
              : "Salvar alterações"}
        </button>

        {!onboarding && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="
              px-4 py-3
              text-xs
              tracking-[0.1em]
              text-muted uppercase
              hover:text-ink
            "
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

/* =============================================================
   CAMPO
============================================================= */

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium tracking-[0.08em] text-ink uppercase"
      >
        {label}
      </label>

      {children}

      {hint && (
        <p className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "mt-2 w-full rounded-sm border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-rose focus:ring-1 focus:ring-rose/10";