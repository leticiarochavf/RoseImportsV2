"use client";

import { useState, useTransition } from "react";
import { updateVariantPrice, updateVariantStock } from "@/features/admin/actions";
import { centsToInput } from "@/lib/money";
import { stockLabel } from "@/lib/stock";
import { ProductImage } from "@/components/product-image";

/**
 * Edição direta na tabela:
 * permite alterar preço e estoque sem sair da tela.
 */
export function StockRow({
  variantId,
  productName,
  productImagePath,
  variantLabel,
  stockQuantity,
  priceCents,
  active,
}: {
  variantId: string;
  productName: string;
  productImagePath: string | null;
  variantLabel: string;
  stockQuantity: number;
  priceCents: number | null;
  active: boolean;
}) {
  const [stock, setStock] = useState(String(stockQuantity));
  const initialPrice = priceCents === null ? "" : centsToInput(priceCents);
  const [price, setPrice] = useState(initialPrice);

  const [savedStock, setSavedStock] = useState(stockQuantity);
  const [savedPrice, setSavedPrice] = useState(initialPrice);

  const [pending, startTransition] = useTransition();

  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const stockChanged = Number(stock) !== savedStock;
  const priceChanged = price !== savedPrice;

  function saveStock() {
    const value = Number(stock);

    if (!Number.isInteger(value) || value < 0) {
      setFeedback({
        ok: false,
        text: "Informe um número inteiro.",
      });

      return;
    }

    startTransition(async () => {
      const result = await updateVariantStock(variantId, value);

      if (result.ok) {
        setSavedStock(value);

        setFeedback({
          ok: true,
          text: "Estoque salvo.",
        });

        return;
      }

      setFeedback({
        ok: false,
        text: result.error,
      });
    });
  }

  function savePrice() {
    startTransition(async () => {
      const result = await updateVariantPrice(variantId, price);

      if (result.ok) {
        setSavedPrice(price);

        setFeedback({
          ok: true,
          text: "Preço salvo.",
        });

        return;
      }

      setFeedback({
        ok: false,
        text: result.error,
      });
    });
  }

  return (
    <tr
      className={`transition-colors hover:bg-ivory/40 ${
        active ? "" : "opacity-55"
      }`}
    >
      {/* Produto */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-ivory">
            <ProductImage
              path={productImagePath}
              alt={productName}
              sizes="48px"
            />
          </div>

          <div className="min-w-0">
            <p className="max-w-[16rem] truncate text-sm font-medium text-ink">
              {productName}
            </p>

            <p className="mt-0.5 text-xs text-muted">
              {variantLabel}

              {!active && (
                <span className="text-danger">
                  {" "}
                  · versão inativa
                </span>
              )}
            </p>
          </div>
        </div>
      </td>

      {/* Preço */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <label
            className="sr-only"
            htmlFor={`preco-${variantId}`}
          >
            Preço de {productName} {variantLabel}
          </label>

          <span className="text-xs text-muted">
            R$
          </span>

          <input
            id={`preco-${variantId}`}
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(event) => {
              setPrice(event.target.value);
              setFeedback(null);
            }}
            className="w-24 rounded-sm border border-line bg-ivory px-2.5 py-1.5 text-sm transition focus:border-rose focus:outline-none"
          />

          {priceChanged && (
            <button
              type="button"
              onClick={savePrice}
              disabled={pending}
              className="text-xs font-medium tracking-[0.08em] text-rose uppercase transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
          )}
        </div>
      </td>

      {/* Estoque */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <label
            className="sr-only"
            htmlFor={`estoque-${variantId}`}
          >
            Estoque de {productName} {variantLabel}
          </label>

          <input
            id={`estoque-${variantId}`}
            type="number"
            min={0}
            max={9999}
            value={stock}
            onChange={(event) => {
              setStock(event.target.value);
              setFeedback(null);
            }}
            className="w-20 rounded-sm border border-line bg-ivory px-2.5 py-1.5 text-sm transition focus:border-rose focus:outline-none"
          />

          {stockChanged && (
            <button
              type="button"
              onClick={saveStock}
              disabled={pending}
              className="text-xs font-medium tracking-[0.08em] text-rose uppercase transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className="text-sm text-muted">
          {stockLabel(savedStock)}
        </span>

        {feedback && (
          <span
            role={feedback.ok ? "status" : "alert"}
            className={`mt-1 block text-xs ${
              feedback.ok
                ? "text-success"
                : "text-danger"
            }`}
          >
            {feedback.text}
          </span>
        )}
      </td>
    </tr>
  );
}
