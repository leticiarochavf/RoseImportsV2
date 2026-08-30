"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/features/cart/cart-context";
import { EmptyState } from "@/components/empty-state";
import { formatCents } from "@/lib/money";
import { imageUrl } from "@/lib/images";
import { delivery } from "@/lib/config/site";

export function CartView() {
  const { items, ready, subtotalCents, setQuantity, remove, clear } = useCart();

  if (!ready) {
    return <div className="space-y-3" role="status">{[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-ivory-deep" />)}<span className="sr-only">Carregando o carrinho</span></div>;
  }

  if (items.length === 0) {
    return <EmptyState title="Seu carrinho está vazio" description="Escolha produtos no catálogo para montar seu pedido." actionLabel="Ver catálogo" actionHref="/catalogo" />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] xl:gap-12">
      <div>
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <ul className="divide-y divide-line">
            {items.map((item) => {
              const unavailable = item.maxQuantity <= 0;
              return (
                <li key={item.variantId} className="grid gap-4 p-4 sm:grid-cols-[5.5rem_1fr_auto] sm:items-center sm:p-5">
                  <Link href={`/produto/${item.slug}`} className="relative aspect-square w-20 overflow-hidden rounded-md border border-line bg-ivory-deep sm:w-[5.5rem]">
                    {item.imagePath ? <Image src={imageUrl(item.imagePath)} alt={item.productName} fill sizes="88px" className="object-contain object-center p-2" /> : <span className="sr-only">{item.productName}</span>}
                  </Link>

                  <div className="min-w-0">
                    <Link href={`/produto/${item.slug}`} className="text-sm font-medium transition-colors hover:text-rose">{item.productName}</Link>
                    <p className="mt-1 text-xs text-muted">{item.variantLabel}</p>
                    {unavailable && <p className="mt-2 text-xs text-danger">Esgotado. Remova este item para continuar.</p>}
                    <button type="button" onClick={() => remove(item.variantId)} className="mt-3 text-xs text-muted underline-offset-4 hover:text-danger hover:underline">Remover</button>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:flex-col sm:items-end">
                    <div className="flex items-center rounded-md border border-line">
                      <button type="button" onClick={() => setQuantity(item.variantId, item.quantity - 1)} className="px-3 py-2 text-base leading-none" aria-label={`Diminuir quantidade de ${item.productName}`}>−</button>
                      <span className="min-w-8 text-center text-sm">{item.quantity}</span>
                      <button type="button" onClick={() => setQuantity(item.variantId, item.quantity + 1)} disabled={item.quantity >= item.maxQuantity} className="px-3 py-2 text-base leading-none disabled:opacity-30" aria-label={`Aumentar quantidade de ${item.productName}`}>+</button>
                    </div>
                    <span className="text-sm font-medium">{formatCents(item.priceCents * item.quantity)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/catalogo" className="text-xs tracking-[0.1em] text-muted uppercase transition-colors hover:text-rose">← Continuar comprando</Link>
          <button type="button" onClick={clear} className="text-xs text-muted underline-offset-4 hover:text-danger hover:underline">Limpar carrinho</button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="rounded-lg border border-line bg-surface p-6">
          <h2 className="font-display text-xl">Resumo do pedido</h2>
          <dl className="mt-6 space-y-4 border-b border-line pb-5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Subtotal</dt><dd>{formatCents(subtotalCents)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Entrega</dt><dd className="max-w-36 text-right text-xs text-muted">Confirmada no atendimento</dd></div>
          </dl>
          <div className="mt-5 flex items-baseline justify-between gap-4"><span className="text-sm font-medium">Total dos produtos</span><span className="font-display text-2xl">{formatCents(subtotalCents)}</span></div>
          <Link href="/finalizar" className="mt-6 flex min-h-12 items-center justify-center bg-ink px-6 text-center text-xs tracking-[0.16em] text-ivory uppercase transition-opacity hover:opacity-85">Finalizar pedido</Link>
          <p className="mt-4 text-xs leading-relaxed text-muted">{delivery.note}</p>
        </div>
      </aside>
    </div>
  );
}
