"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Influencer } from "@/types/database";

import { createInfluencer, updateInfluencer } from "./actions";

export function InfluencerForm({
  influencer,
}: {
  influencer: Influencer | null;
}) {
  const router = useRouter();

  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  function handleSubmit(formData: FormData) {
    setFeedback(null);

    startTransition(async () => {
      const result = influencer
        ? await updateInfluencer(influencer.id, formData)
        : await createInfluencer(formData);

      if (!result.ok) {
        setFeedback({ ok: false, text: result.error });
        return;
      }

      setFeedback({ ok: true, text: result.message });

      if (!influencer) router.push("/admin/influenciadores");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="eyebrow">
            Nome
          </label>

          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            defaultValue={influencer?.name ?? ""}
            className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="handle" className="eyebrow">
            Perfil{" "}
            <span className="text-muted lowercase tracking-normal">
              (opcional)
            </span>
          </label>

          <input
            id="handle"
            name="handle"
            type="text"
            maxLength={60}
            defaultValue={influencer?.handle ?? ""}
            placeholder="@duda"
            className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="eyebrow">
          Observações{" "}
          <span className="text-muted lowercase tracking-normal">
            (opcional)
          </span>
        </label>

        <textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={500}
          defaultValue={influencer?.notes ?? ""}
          placeholder="Combinado de comissão, período da parceria, contato…"
          className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
        />
      </div>

      <label className="flex cursor-pointer gap-3 border border-line bg-surface px-4 py-3.5">
        <input
          type="checkbox"
          name="active"
          defaultChecked={influencer?.active ?? true}
          className="mt-0.5 h-4 w-4 shrink-0 accent-rose"
        />

        <span>
          <span className="block text-sm text-ink">Influenciador ativo</span>

          <span className="mt-1 block text-xs leading-relaxed text-muted">
            Desmarcado, sai da lista de escolha ao criar cupom. Os cupons e as
            vendas que já existem continuam atribuídos a ele.
          </span>
        </span>
      </label>

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
          {pending
            ? "Salvando…"
            : influencer
              ? "Salvar influenciador"
              : "Criar influenciador"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/admin/influenciadores")}
          className="text-xs tracking-[0.1em] text-muted uppercase hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
