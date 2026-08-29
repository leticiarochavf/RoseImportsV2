"use client";

import { useState, useTransition } from "react";
import { updateVariantPrice, updateVariantStock } from "@/features/admin/actions";
import { centsToInput } from "@/lib/money";
import { stockLabel } from "@/lib/stock";

/**
 * Edição direta na tabela: sem abrir tela, sem sair do contexto.
 * A quantidade real aparece aqui — é a única tela onde ela é visível. (§31)
 */
export function StockRow({
  variantId,
  productName,
  variantLabel,
  stockQuantity,
  priceCents,
  active,
}: {
  variantId: string;
  productName: string;
  variantLabel: string;
  stockQuantity: number;
  priceCents: number;
  active: boolean;
}) {
  const [stock, setStock] = useState(String(stockQuantity));
  const [price, setPrice] = useState(centsToInput(priceCents));
  const [savedStock, setSavedStock] = useState(stockQuantity);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { ok: boolean; text: string } | null
  >(null);

  const stockChanged = Number(stock) !== savedStock;
  const priceChanged = price !== centsToInput(priceCents);

  function saveStock() {
    const value = Number(stock);
    if (!Number.isInteger(value) || value < 0) {
      setFeedback({ ok: false, text: "Informe um número inteiro." });
      return;
    }

    startTransition(async () => {
      const result = await updateVariantStock(variantId, value);
      if (result.ok) setSavedStock(value);
      setFeedback(
        result.ok
          ? { ok: true, text: "Estoque salvo." }
          : { ok: false, text: result.error },
      );
    });
  }

  function savePrice() {
    startTransition(async () => {
      const result = await updateVariantPrice(variantId, price);
      setFeedback(
        result.ok
          ? { ok: true, text: "Preço salvo." }
          : { ok: false, text: result.error },
      );
    });
  }

  return (
    <tr className={active ? "" : "opacity-55"}>
      <td className="px-4 py-3">
        <p className="text-sm">{productName}</p>
        <p className="mt-0.5 text-xs text-muted">
          {variantLabel}
          {!active && " · versão inativa"}
        </p>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`preco-${variantId}`}>
            Preço de {productName} {variantLabel}
          </label>
          <span className="text-xs text-muted">R$</span>
          <input
            id={`preco-${variantId}`}
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-24 border border-line bg-ivory px-2.5 py-1.5 text-sm focus:border-rose focus:outline-none"
          />
          {priceChanged && (
            <button
              type="button"
              onClick={savePrice}
              disabled={pending}
              className="text-xs tracking-[0.1em] text-rose uppercase hover:underline disabled:opacity-50"
            >
              Salvar
            </button>
          )}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`estoque-${variantId}`}>
            Estoque de {productName} {variantLabel}
          </label>
          <input
            id={`estoque-${variantId}`}
            type="number"
            min={0}
            max={9999}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-20 border border-line bg-ivory px-2.5 py-1.5 text-sm focus:border-rose focus:outline-none"
          />
          {stockChanged && (
            <button
              type="button"
              onClick={saveStock}
              disabled={pending}
              className="text-xs tracking-[0.1em] text-rose uppercase hover:underline disabled:opacity-50"
            >
              Salvar
            </button>
          )}
        </div>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm text-muted">{stockLabel(savedStock)}</span>
        {feedback && (
          <span
            role={feedback.ok ? "status" : "alert"}
            className={`mt-0.5 block text-xs ${
              feedback.ok ? "text-success" : "text-danger"
            }`}
          >
            {feedback.text}
          </span>
        )}
      </td>
    </tr>
  );
}
