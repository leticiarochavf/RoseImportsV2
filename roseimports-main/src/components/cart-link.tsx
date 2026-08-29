"use client";

import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";

export function CartLink() {
  const { count, ready } = useCart();

  return (
    <Link
      href="/carrinho"
      className="relative inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase transition-colors hover:text-rose"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        aria-hidden
      >
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      <span className="hidden sm:inline">Carrinho</span>
      {ready && count > 0 && (
        <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[0.625rem] text-white sm:static sm:ml-0.5">
          {count}
        </span>
      )}
      <span className="sr-only">
        {ready && count > 0 ? `${count} itens no carrinho` : "Carrinho vazio"}
      </span>
    </Link>
  );
}
