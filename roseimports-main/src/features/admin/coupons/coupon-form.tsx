"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { normalizeCouponCode } from "@/lib/coupons";
import type { Coupon, Influencer } from "@/types/database";

import { createCoupon, updateCoupon } from "./actions";

type InfluencerOption = Pick<Influencer, "id" | "name" | "handle">;

/**
 * timestamptz do banco → valor do input datetime-local, no fuso de quem
 * está olhando. O input não aceita segundos nem fuso, então cortamos em
 * minutos.
 */
function toLocalInput(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** Caminho de volta: a hora que o admin digitou é a hora local dele. */
function toInstant(localValue: string): string {
  if (!localValue) return "";

  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function CouponForm({
  coupon,
  influencers,
}: {
  coupon: Coupon | null;
  influencers: InfluencerOption[];
}) {
  const router = useRouter();

  const [code, setCode] = useState(coupon?.code ?? "");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  function handleSubmit(formData: FormData) {
    setFeedback(null);

    // O input entrega hora local; o banco guarda instante com fuso.
    formData.set(
      "startsAt",
      toInstant(String(formData.get("startsAtLocal") ?? "")),
    );
    formData.set(
      "expiresAt",
      toInstant(String(formData.get("expiresAtLocal") ?? "")),
    );

    startTransition(async () => {
      const result = coupon
        ? await updateCoupon(coupon.id, formData)
        : await createCoupon(formData);

      if (!result.ok) {
        setFeedback({ ok: false, text: result.error });
        return;
      }

      setFeedback({ ok: true, text: result.message });

      if (!coupon) router.push("/admin/cupons");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      {/* IDENTIFICAÇÃO */}

      <section>
        <div className="mb-5">
          <h3 className="text-sm font-medium text-ink">Cupom</h3>

          <p className="mt-1 text-xs text-muted">
            O código é gravado em maiúsculas. Quem digitar “{code ? code.toLowerCase() : "duda10"}”
            no checkout chega no mesmo cupom.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="code" className="eyebrow">
              Código
            </label>

            <input
              id="code"
              name="code"
              type="text"
              required
              maxLength={24}
              value={code}
              onChange={(event) =>
                setCode(normalizeCouponCode(event.target.value))
              }
              placeholder="DUDA10"
              className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm tracking-[0.08em] uppercase focus:border-rose focus:outline-none"
            />

            <p className="mt-2 text-xs text-muted">
              De 3 a 24 caracteres: letras, números e hífen.
            </p>
          </div>

          <div>
            <label htmlFor="discountPercent" className="eyebrow">
              Desconto (%)
            </label>

            <input
              id="discountPercent"
              name="discountPercent"
              type="number"
              required
              min={1}
              max={100}
              step={1}
              defaultValue={coupon?.discount_percent ?? ""}
              className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
            />

            <p className="mt-2 text-xs text-muted">
              Percentual aplicado sobre o subtotal do pedido.
            </p>
          </div>
        </div>
      </section>

      {/* ATRIBUIÇÃO */}

      <section>
        <div className="mb-5">
          <h3 className="text-sm font-medium text-ink">Atribuição</h3>

          <p className="mt-1 text-xs text-muted">
            De quem é a divulgação. É por aqui que o relatório soma as
            vendas de cada influenciador.
          </p>
        </div>

        <div>
          <label htmlFor="influencerId" className="eyebrow">
            Influenciador
          </label>

          <select
            id="influencerId"
            name="influencerId"
            defaultValue={coupon?.influencer_id ?? ""}
            className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
          >
            <option value="">Sem influenciador</option>

            {influencers.map((influencer) => (
              <option key={influencer.id} value={influencer.id}>
                {influencer.name}
                {influencer.handle ? ` (${influencer.handle})` : ""}
              </option>
            ))}
          </select>

          {influencers.length === 0 && (
            <p className="mt-2 text-xs text-muted">
              Nenhum influenciador cadastrado ainda. Dá para criar o cupom
              sem vínculo e ligar depois.
            </p>
          )}
        </div>
      </section>

      {/* VALIDADE E LIMITE */}

      <section>
        <div className="mb-5">
          <h3 className="text-sm font-medium text-ink">Validade e limite</h3>

          <p className="mt-1 text-xs text-muted">
            Campos em branco significam sem restrição: sem data de início o
            cupom vale desde já, sem validade não expira, sem limite de usos
            não acaba.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label htmlFor="startsAtLocal" className="eyebrow">
              Início
            </label>

            <input
              id="startsAtLocal"
              name="startsAtLocal"
              type="datetime-local"
              defaultValue={toLocalInput(coupon?.starts_at ?? null)}
              className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="expiresAtLocal" className="eyebrow">
              Validade
            </label>

            <input
              id="expiresAtLocal"
              name="expiresAtLocal"
              type="datetime-local"
              defaultValue={toLocalInput(coupon?.expires_at ?? null)}
              className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="maxUses" className="eyebrow">
              Máximo de usos
            </label>

            <input
              id="maxUses"
              name="maxUses"
              type="number"
              min={1}
              step={1}
              defaultValue={coupon?.max_uses ?? ""}
              placeholder="Ilimitado"
              className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
            />
          </div>
        </div>

        {coupon && (
          <p className="mt-4 border-l-2 border-rose-soft bg-rose-wash px-4 py-3 text-xs text-ink-soft">
            Já usado por {coupon.uses_reserved}{" "}
            {coupon.uses_reserved === 1 ? "pedido" : "pedidos"} —{" "}
            {coupon.uses_confirmed} com pagamento confirmado. Um limite menor
            que {coupon.uses_reserved} é recusado pelo banco.
          </p>
        )}
      </section>

      {/* EXIBIÇÃO */}

      <section>
        <div className="mb-5">
          <h3 className="text-sm font-medium text-ink">Situação</h3>
        </div>

        <div className="space-y-3">
          <Checkbox
            name="active"
            defaultChecked={coupon?.active ?? true}
            title="Cupom ativo"
            description="Desmarcado, o cupom para de valer no checkout na hora. Pedidos antigos continuam com o desconto que já receberam."
          />

          <Checkbox
            name="showInShowcase"
            defaultChecked={coupon?.show_in_showcase ?? false}
            title="Aparece na vitrine"
            description="Só exibição pública. Um cupom pode valer no checkout sem aparecer para todo mundo, para uso exclusivo do influenciador."
          />
        </div>
      </section>

      {feedback && (
        <p
          role="alert"
          className={`border px-4 py-3 text-sm ${
            feedback.ok
              ? "border-success/30 bg-success/5 text-success"
              : "border-danger/30 bg-danger/5 text-danger"
          }`}
        >
          {feedback.text}
        </p>
      )}

      <div className="flex items-center gap-4 border-t border-line pt-6">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink px-6 py-3.5 text-xs font-medium tracking-[0.1em] text-ivory uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Salvando…" : coupon ? "Salvar cupom" : "Criar cupom"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/admin/cupons")}
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Checkbox({
  name,
  defaultChecked,
  title,
  description,
}: {
  name: string;
  defaultChecked: boolean;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 border border-line bg-surface px-4 py-3.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-rose"
      />

      <span>
        <span className="block text-sm text-ink">{title}</span>

        <span className="mt-1 block text-xs leading-relaxed text-muted">
          {description}
        </span>
      </span>
    </label>
  );
}
