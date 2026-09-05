"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ADMIN_PAGE_SIZES,
  ADMIN_PAGE_SIZE_ALL,
  ADMIN_PAGE_SIZE_DEFAULT,
} from "@/features/admin/product-filters.constants";

type Option = { value: string; label: string };

type Props = {
  categories: Option[];
  brands: string[];
};

const BASE = "/admin/produtos";

/**
 * Filtros da listagem de produtos do painel.
 *
 * Mesmo padrão de estado do filtro da loja (`catalog-filters.tsx`): tudo
 * mora na URL, um `router.replace` por alteração, e qualquer mudança de
 * busca, filtro ou quantidade volta para a primeira página.
 */
export function AdminProductFilters({ categories, brands }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = params.get("q") ?? "";
  const categoria = params.get("categoria") ?? "";
  const marca = params.get("marca") ?? "";
  const genero = params.get("genero") ?? "";
  const situacao = params.get("situacao") ?? "";
  const destaque = params.get("destaque") ?? "";
  const estoque = params.get("estoque") ?? "";
  const porPagina = params.get("por_pagina") ?? String(ADMIN_PAGE_SIZE_DEFAULT);

  const [term, setTerm] = useState(q);
  const firstRender = useRef(true);

  // Mantém o campo em sincronia quando a navegação vem de fora.
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
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  function apply(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);

    // Trocar busca, filtro ou quantidade nunca pode deixar o painel numa
    // página que não existe mais no novo resultado.
    next.delete("pagina");

    startTransition(() => {
      router.replace(next.toString() ? `${BASE}?${next}` : BASE, {
        scroll: false,
      });
    });
  }

  const hasChoice = Boolean(
    q ||
      categoria ||
      marca ||
      genero ||
      situacao ||
      destaque ||
      estoque ||
      porPagina !== String(ADMIN_PAGE_SIZE_DEFAULT),
  );

  return (
    <div className="border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <label htmlFor="q" className="sr-only">
            Buscar produto
          </label>

          <input
            id="q"
            name="q"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                apply("q", term);
              }
            }}
            placeholder="Buscar por nome ou marca..."
            className={`${inputClass} py-2.5 pr-3 pl-9`}
          />

          <svg
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => apply("q", term)}
            className="
              inline-flex h-10 items-center
              bg-ink px-5
              text-xs font-medium
              tracking-[0.08em]
              text-ivory uppercase
              transition-opacity
              hover:opacity-90
            "
          >
            Buscar
          </button>

          {hasChoice && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                startTransition(() =>
                  router.replace(BASE, { scroll: false }),
                );
              }}
              className="text-xs tracking-[0.08em] text-rose uppercase underline-offset-4 hover:underline"
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

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-6">
        <Select
          label="Categoria"
          value={categoria}
          onChange={(value) => apply("categoria", value)}
          options={categories}
          allLabel="Todas"
        />

        <Select
          label="Marca"
          value={marca}
          onChange={(value) => apply("marca", value)}
          options={brands.map((brand) => ({ value: brand, label: brand }))}
          allLabel="Todas"
        />

        <Select
          label="Gênero"
          value={genero}
          onChange={(value) => apply("genero", value)}
          options={[
            { value: "feminino", label: "Feminino" },
            { value: "masculino", label: "Masculino" },
            { value: "unissex", label: "Unissex" },
          ]}
          allLabel="Todos"
        />

        <Select
          label="Situação"
          value={situacao}
          onChange={(value) => apply("situacao", value)}
          options={[
            { value: "ativo", label: "Ativos" },
            { value: "inativo", label: "Inativos" },
          ]}
          allLabel="Todas"
        />

        <Select
          label="Destaque"
          value={destaque}
          onChange={(value) => apply("destaque", value)}
          options={[
            { value: "sim", label: "Em destaque" },
            { value: "nao", label: "Sem destaque" },
          ]}
          allLabel="Todos"
        />

        <Select
          label="Estoque"
          value={estoque}
          onChange={(value) => apply("estoque", value)}
          options={[{ value: "sem", label: "Sem estoque" }]}
          allLabel="Todos"
        />
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
        <Select
          label="Exibir"
          value={porPagina}
          onChange={(value) => apply("por_pagina", value)}
          options={[
            ...ADMIN_PAGE_SIZES.map((size) => ({
              value: String(size),
              label: String(size),
            })),
            { value: ADMIN_PAGE_SIZE_ALL, label: "Todos" },
          ]}
          className="w-28"
        />
      </div>
    </div>
  );
}

/** Mesmo campo de texto/select do formulário de produto (`product-form.tsx`). */
const inputClass =
  "w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-rose focus:ring-1 focus:ring-rose/10";

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  /** Ausente quando o seletor não tem estado "sem filtro" (ex.: Exibir). */
  allLabel?: string;
  className?: string;
}) {
  const id = `admin-filtro-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="text-xs font-medium tracking-[0.08em] text-ink uppercase"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} mt-2 cursor-pointer`}
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
