"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/features/cart/cart-context";
import { StockBadge } from "@/components/stock-badge";
import { formatCents } from "@/lib/money";
import { delivery } from "@/lib/config/site";
import type { ProductDetail } from "@/features/catalog/queries";

export function VariantSelector({
  product,
  coverPath,
}: {
  product: ProductDetail;
  coverPath: string | null;
}) {
  const { add, items } = useCart();

  // Começa na primeira versão disponível, não na primeira da lista.
  const initial = useMemo(() => {
    const available = product.variants.find((v) => v.maxQuantity > 0);
    return (available ?? product.variants[0])?.id ?? "";
  }, [product.variants]);

  const [selectedId, setSelectedId] = useState(initial);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = product.variants.find((v) => v.id === selectedId);

  const inCart =
    items.find((i) => i.variantId === selectedId)?.quantity ?? 0;
  const remaining = selected ? Math.max(selected.maxQuantity - inCart, 0) : 0;
  const canAdd = Boolean(selected) && remaining > 0;

  // Troca de versão recomeça a quantidade em 1.
  useEffect(() => setQuantity(1), [selectedId]);

  // A confirmação some sozinha; não exige ação do usuário.
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 4000);
    return () => clearTimeout(timer);
  }, [added]);

  function handleAdd() {
    if (!selected || !canAdd) return;

    add(
      {
        variantId: selected.id,
        productId: product.id,
        slug: product.slug,
        productName: product.name,
        variantLabel: selected.label,
        priceCents: selected.priceCents,
        imagePath: coverPath,
        maxQuantity: selected.maxQuantity,
      },
      quantity,
    );

    setAdded(true);
  }

  if (product.variants.length === 0) {
    return (
      <p className="border border-line bg-surface px-4 py-3 text-sm text-muted">
        Este produto ainda não tem versões cadastradas.
      </p>
    );
  }

  return (
    <div className="space-y-7">
      {/* -------- Versões -------- */}
      <fieldset>
        <legend className="eyebrow">
          {product.variants.length > 1 ? "Escolha a versão" : "Versão"}
        </legend>

        <div className="mt-3 flex flex-wrap gap-2.5">
          {product.variants.map((variant) => {
            const soldOut = variant.maxQuantity <= 0;
            const isSelected = variant.id === selectedId;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedId(variant.id)}
                aria-pressed={isSelected}
                className={`min-w-24 border px-4 py-2.5 text-left transition-colors ${
                  isSelected
                    ? "border-rose bg-rose-wash"
                    : "border-line bg-surface hover:border-line-strong"
                } ${soldOut ? "opacity-55" : ""}`}
              >
                <span className="block text-sm">{variant.label}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {soldOut ? "Esgotado" : formatCents(variant.priceCents)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* -------- Preço e disponibilidade -------- */}
      {selected && (
        <div>
          <p className="font-display text-3xl">
            {formatCents(selected.priceCents)}
          </p>
          <StockBadge status={selected.stock} className="mt-2" />
          {selected.variantType === "decant" && (
            <p className="mt-2 max-w-sm text-xs text-muted">
              Decant: porção do perfume original envasada em frasco próprio.
            </p>
          )}
        </div>
      )}

      {/* -------- Quantidade e ação -------- */}
      {selected && selected.maxQuantity > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="eyebrow">Quantidade</span>
            <div className="flex items-center border border-line bg-surface">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="px-3.5 py-2 text-lg leading-none disabled:opacity-30"
              >
                <span aria-hidden>−</span>
                <span className="sr-only">Diminuir quantidade</span>
              </button>
              <span
                className="min-w-10 text-center text-sm"
                aria-live="polite"
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(remaining, q + 1))}
                disabled={quantity >= remaining}
                className="px-3.5 py-2 text-lg leading-none disabled:opacity-30"
              >
                <span aria-hidden>+</span>
                <span className="sr-only">Aumentar quantidade</span>
              </button>
            </div>
          </div>

          {inCart > 0 && remaining === 0 && (
            <p className="text-xs text-rose">
              Você já tem todas as unidades disponíveis desta versão no
              carrinho.
            </p>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="w-full bg-ink px-8 py-4 text-xs tracking-[0.18em] text-ivory uppercase transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Adicionar ao carrinho
          </button>

          {added && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-3 border border-rose-soft bg-rose-wash px-4 py-3"
            >
              <span className="text-sm">Adicionado ao carrinho.</span>
              <Link
                href="/carrinho"
                className="text-xs tracking-[0.14em] text-rose uppercase underline-offset-4 hover:underline"
              >
                Ver carrinho
              </Link>
            </div>
          )}
        </div>
      )}

      {selected && selected.maxQuantity <= 0 && (
        <div className="border border-line bg-surface px-4 py-4">
          <p className="text-sm">Esta versão está esgotada no momento.</p>
          <p className="mt-1 text-xs text-muted">
            Escolha outra versão acima ou fale com a gente no WhatsApp para
            saber quando volta.
          </p>
        </div>
      )}

      <p className="border-t border-line pt-5 text-xs text-muted">
        {delivery.note}
      </p>
    </div>
  );
}
