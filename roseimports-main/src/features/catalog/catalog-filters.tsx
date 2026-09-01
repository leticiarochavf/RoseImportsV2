"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { track } from "@/lib/analytics";
import { CATALOG_SORTS } from "@/features/catalog/sorting";
import type { Category, OlfactoryFamily } from "@/features/catalog/types";

type Props = {
  categories: Category[];
  families: OlfactoryFamily[];
};

/** Quinta opção do seletor: não ordena, abre os campos de faixa. */
const FAIXA_OPTION = "faixa";

export function CatalogFilters({ categories, families }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = params.get("q") ?? "";
  const categoria = params.get("categoria") ?? "";
  const genero = params.get("genero") ?? "";
  const familia = params.get("familia") ?? "";
  const ordenar = params.get("ordenar") ?? "padrao";
  const precoMin = params.get("preco_min") ?? "";
  const precoMax = params.get("preco_max") ?? "";

  const [term, setTerm] = useState(q);
  const firstRender = useRef(true);

  // Mantém o campo em sincronia quando a navegação vem de fora (voltar, link).
  useEffect(() => setTerm(q), [q]);

  // Busca com atraso: evita uma consulta por tecla digitada.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (term === q) return;
      apply("q", term);
      if (term) track({ name: "search", query: term });
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  function apply(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("pagina");

    startTransition(() => {
      router.replace(next.toString() ? `/catalogo?${next}` : "/catalogo", {
        scroll: false,
      });
    });
  }

  /** Faixa de preço muda os dois extremos de uma vez; um `apply` por campo
      geraria duas navegações e a segunda sobrescreveria a primeira. */
  function applyMany(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }

    next.delete("pagina");

    startTransition(() => {
      router.replace(next.toString() ? `/catalogo?${next}` : "/catalogo", {
        scroll: false,
      });
    });
  }

  function onFilter(key: string, value: string) {
    apply(key, value);
    if (value) track({ name: "filter_used", filter: key, value });
  }

  const hasFilters = Boolean(
    q || categoria || genero || familia || precoMin || precoMax,
  );
  const hasAnyChoice = hasFilters || ordenar !== "padrao";

  // A faixa fica escondida até ser pedida; se já houver valor na URL
  // (link compartilhado, voltar do navegador), abre sozinha.
  const [faixaAberta, setFaixaAberta] = useState(false);
  const mostrarFaixa = faixaAberta || Boolean(precoMin || precoMax);

  return (
    <div className="space-y-5">
      <div className="relative">
        <label htmlFor="busca" className="sr-only">
          Buscar por nome ou marca
        </label>
        <input
          id="busca"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nome ou marca"
          className="w-full border border-line bg-surface py-3 pr-4 pl-11 text-sm placeholder:text-muted focus:border-rose focus:outline-none"
        />
        <svg
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <Select
          label="Categoria"
          value={categoria}
          onChange={(v) => onFilter("categoria", v)}
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
          allLabel="Todas"
        />

        <Select
          label="Gênero"
          value={genero}
          onChange={(v) => onFilter("genero", v)}
          options={[
            { value: "feminino", label: "Feminino" },
            { value: "masculino", label: "Masculino" },
          ]}
          allLabel="Todos"
        />

        {(!categoria || categoria === "perfumes") && (
          <Select
            label="Família olfativa"
            value={familia}
            onChange={(v) => onFilter("familia", v)}
            options={families.map((f) => ({ value: f.slug, label: f.name }))}
            allLabel="Todas"
          />
        )}

        <Select
          label="Ordenar por"
          value={mostrarFaixa ? FAIXA_OPTION : ordenar === "padrao" ? "" : ordenar}
          onChange={(v) => {
            if (v === FAIXA_OPTION) {
              // Abrir a faixa não é uma ordenação: a ordem atual continua.
              setFaixaAberta(true);
              return;
            }

            setFaixaAberta(false);
            onFilter("ordenar", v);
          }}
          options={[
            ...CATALOG_SORTS.filter((s) => s.value !== "padrao").map((s) => ({
              value: s.value,
              label: s.label,
            })),
            { value: FAIXA_OPTION, label: "Faixa de preço" },
          ]}
          allLabel="Padrão da loja"
        />

        {/* Só aparece quando pedida — não ocupa a linha o tempo todo. */}
        {mostrarFaixa && (
          <PriceRange
            min={precoMin}
            max={precoMax}
            onApply={(min, max) => {
              applyMany({ preco_min: min, preco_max: max });
              if (min || max) {
                track({
                  name: "filter_used",
                  filter: "preco",
                  value: `${min || "0"}-${max || "∞"}`,
                });
              }
            }}
            onClose={() => {
              setFaixaAberta(false);
              if (precoMin || precoMax) applyMany({ preco_min: "", preco_max: "" });
            }}
          />
        )}

        {hasAnyChoice && (
          <button
            type="button"
            onClick={() =>
              startTransition(() => router.replace("/catalogo", { scroll: false }))
            }
            className="text-xs tracking-[0.14em] text-rose uppercase underline-offset-4 hover:underline"
          >
            Limpar filtros
          </button>
        )}

        {isPending && (
          <span className="text-xs text-muted" role="status">
            Atualizando…
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Faixa de preço, inline na mesma linha dos demais filtros. Fica oculta
 * até o cliente pedir pela opção "Faixa de preço" do seletor — deixá-la
 * sempre visível ocupava uma faixa inteira da tela por um filtro que a
 * maioria não usa.
 */
function PriceRange({
  min,
  max,
  onApply,
  onClose,
}: {
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
  onClose: () => void;
}) {
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);

  // Navegação externa (voltar, link compartilhado) reposiciona os campos.
  useEffect(() => setLocalMin(min), [min]);
  useEffect(() => setLocalMax(max), [max]);

  function submit() {
    // Faixa invertida não quebra a listagem: os extremos trocam de lugar.
    const shouldSwap =
      localMin !== "" && localMax !== "" && Number(localMin) > Number(localMax);

    const finalMin = shouldSwap ? localMax : localMin;
    const finalMax = shouldSwap ? localMin : localMax;

    setLocalMin(finalMin);
    setLocalMax(finalMax);
    onApply(finalMin, finalMax);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="eyebrow" style={{ fontSize: "0.5625rem" }}>
        Preço
      </span>

      <PriceInput
        id="preco-min"
        label="Preço mínimo"
        value={localMin}
        onChange={setLocalMin}
        onEnter={submit}
      />

      <span className="text-sm text-muted" aria-hidden>
        –
      </span>

      <PriceInput
        id="preco-max"
        label="Preço máximo"
        value={localMax}
        onChange={setLocalMax}
        onEnter={submit}
      />

      <button
        type="button"
        onClick={submit}
        className="inline-flex h-8 items-center rounded-md border border-line-strong px-3 text-xs font-semibold transition-colors hover:border-rose hover:text-rose"
      >
        Aplicar
      </button>

      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar faixa de preço"
        title="Fechar faixa de preço"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:text-rose"
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}

function PriceInput({
  id,
  label,
  value,
  onChange,
  onEnter,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="text-xs text-muted" aria-hidden>
        R$
      </span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder="—"
        className="w-16 border-b border-line bg-ivory py-1 text-sm text-ink focus:border-rose focus:outline-none"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  const id = `filtro-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="eyebrow" style={{ fontSize: "0.5625rem" }}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="filter-select cursor-pointer border-b border-line bg-ivory py-1 pr-1 text-sm text-ink focus:border-rose focus:outline-none"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
