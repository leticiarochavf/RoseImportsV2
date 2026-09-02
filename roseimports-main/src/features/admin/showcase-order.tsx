"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ProductImage } from "@/components/product-image";
import { saveShowcaseOrder } from "@/features/admin/actions";
import type { ProductCard } from "@/features/catalog/queries";
import { formatCents } from "@/lib/money";

/* ---------------------------------------------------------------
   Organização da vitrine.

   Arrastar usa a API nativa do navegador — nenhuma biblioteca nova
   entra no projeto por causa desta tela. Como nem todo mundo arrasta
   (teclado, leitor de tela, dedo em tela pequena), cada linha também
   tem os botões de subir e descer, que fazem exatamente a mesma coisa.

   A lista vem inteira, sem paginação: com paginação, a posição visível
   deixaria de corresponder à real e arrastar entre páginas viraria
   adivinhação.
   --------------------------------------------------------------- */

type Feedback = { ok: boolean; text: string } | null;

export function ShowcaseOrder({ products }: { products: ProductCard[] }) {
  const [order, setOrder] = useState(products);
  const [busca, setBusca] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  // Uma edição no catálogo (produto novo, desativado) troca a lista base.
  useEffect(() => setOrder(products), [products]);

  const termo = busca.trim().toLowerCase();
  const buscando = termo.length > 0;

  const visiveis = useMemo(() => {
    if (!buscando) return order;

    return order.filter((product) => {
      const alvo = `${product.name} ${product.brand ?? ""} ${
        product.categoryName ?? ""
      }`.toLowerCase();

      return alvo.includes(termo);
    });
  }, [order, termo, buscando]);

  /** Move um item de uma posição para outra na lista completa. */
  function move(from: number, to: number) {
    setOrder((current) => {
      if (to < 0 || to >= current.length || from === to) return current;

      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (!moved) return current;

      next.splice(to, 0, moved);
      return next;
    });

    setFeedback(null);
  }

  function salvar() {
    setFeedback(null);

    startTransition(async () => {
      const result = await saveShowcaseOrder(order.map((p) => p.id));

      setFeedback({
        ok: result.ok,
        text: result.ok ? result.message : result.error,
      });
    });
  }

  const alterado = order.some(
    (product, index) => products[index]?.id !== product.id,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, marca ou categoria..."
          aria-label="Buscar produto na lista"
          className="
            h-11 w-full max-w-xl
            border border-line bg-surface px-3 text-sm
            outline-none transition
            placeholder:text-muted focus:border-line-strong
          "
        />

        <div className="flex items-center gap-3">
          {feedback && (
            <span
              role="status"
              className={`text-xs ${feedback.ok ? "text-green-700" : "text-rose"}`}
            >
              {feedback.text}
            </span>
          )}

          <button
            type="button"
            onClick={salvar}
            disabled={isPending || !alterado}
            className="
              h-11 shrink-0 bg-ink px-5
              text-xs font-medium tracking-[0.08em] text-ivory uppercase
              transition-opacity hover:opacity-90
              disabled:cursor-not-allowed disabled:opacity-40
            "
          >
            {isPending ? "Salvando..." : "Salvar ordem"}
          </button>
        </div>
      </div>

      <p className="text-sm text-muted">
        {buscando ? (
          <>
            Arraste desabilitado enquanto há busca: a posição na lista filtrada
            não corresponde à posição real.{" "}
            <button
              type="button"
              onClick={() => setBusca("")}
              className="text-rose underline-offset-4 hover:underline"
            >
              Limpe a busca para reordenar.
            </button>
          </>
        ) : (
          "Arraste os produtos na lista abaixo para definir a ordem exibida na vitrine."
        )}
      </p>

      <ol className="divide-y divide-line border border-line bg-surface">
        {visiveis.map((product) => {
          const index = order.indexOf(product);

          return (
            <li
              key={product.id}
              draggable={!buscando}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => {
                if (buscando || dragIndex === null) return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (buscando || dragIndex === null) return;
                e.preventDefault();
                move(dragIndex, index);
                setDragIndex(null);
              }}
              className={`
                flex items-center gap-3 p-3
                ${buscando ? "" : "cursor-grab active:cursor-grabbing"}
                ${dragIndex === index ? "opacity-50" : ""}
              `}
            >
              <span className="w-8 shrink-0 text-center text-xs text-muted tabular-nums">
                {index + 1}
              </span>

              <span
                aria-hidden
                className={`shrink-0 text-lg leading-none ${
                  buscando ? "text-line-strong" : "text-muted"
                }`}
              >
                ⠿
              </span>

              <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-line bg-ivory">
                <ProductImage
                  path={product.imagePath}
                  alt={product.imageAlt ?? product.name}
                  sizes="48px"
                  className="object-contain object-center"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="truncate text-xs text-muted">
                  {[product.brand, product.categoryName]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>

              <span className="shrink-0 text-sm tabular-nums">
                {product.fromPriceCents !== null
                  ? formatCents(product.fromPriceCents)
                  : "—"}
              </span>

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={buscando || index === 0}
                  aria-label={`Mover ${product.name} para cima`}
                  className="
                    flex h-9 w-9 items-center justify-center
                    border border-line text-sm transition
                    hover:border-ink disabled:opacity-30
                  "
                >
                  <span aria-hidden>↑</span>
                </button>

                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={buscando || index === order.length - 1}
                  aria-label={`Mover ${product.name} para baixo`}
                  className="
                    flex h-9 w-9 items-center justify-center
                    border border-line text-sm transition
                    hover:border-ink disabled:opacity-30
                  "
                >
                  <span aria-hidden>↓</span>
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {visiveis.length === 0 && (
        <p className="border border-line bg-surface p-6 text-center text-sm text-muted">
          Nenhum produto encontrado para essa busca.
        </p>
      )}
    </div>
  );
}
