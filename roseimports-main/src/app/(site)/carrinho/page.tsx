import type { Metadata } from "next";
import Link from "next/link";
import { CartView } from "@/features/cart/cart-view";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false },
};

export default function CarrinhoPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-12">
      <nav aria-label="Trilha" className="text-xs text-muted">
        <Link href="/" className="hover:text-rose">Início</Link>
        <span className="mx-2" aria-hidden>/</span>
        <span>Carrinho</span>
      </nav>
      <header className="mt-6 max-w-xl">
        <h1 className="text-3xl sm:text-4xl">Meu carrinho</h1>
        <p className="mt-2 text-sm text-muted">Revise os itens antes de continuar para a finalização do pedido.</p>
      </header>
      <div className="mt-8"><CartView /></div>
    </div>
  );
}
