"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { track } from "@/lib/analytics";
import type { Category, OlfactoryFamily } from "@/features/catalog/types";

type Props = {
  categories: Category[];
  families: OlfactoryFamily[];
};

export function CatalogFilters({ categories, families }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = params.get("q") ?? "";
  const categoria = params.get("categoria") ?? "";
  const genero = params.get("genero") ?? "";
  const familia = params.get("familia") ?? "";

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

  function onFilter(key: string, value: string) {
    apply(key, value);
    if (value) track({ name: "filter_used", filter: key, value });
  }

  const hasFilters = Boolean(q || categoria || genero || familia);

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

        {hasFilters && (
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
