"use client";

import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";

export function CartLink() {
  const { count, ready } = useCart();

  const hasItems = ready && count > 0;

  return (
    <Link
      href="/carrinho"
      aria-label={
        hasItems
          ? `Carrinho com ${count} ${count === 1 ? "item" : "itens"}`
          : "Carrinho vazio"
      }
      className="
        group relative
        flex h-10 items-center justify-center gap-2
        rounded-lg px-2.5
        text-sm font-medium
        transition-all duration-200
        hover:bg-rose/10
        hover:text-rose
        active:scale-[0.97]
        sm:px-3
      "
    >
      {/* Ícone do carrinho */}
      <div className="relative">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="
            transition-all duration-200
            group-hover:-translate-y-0.5
            group-hover:scale-105
          "
          aria-hidden
        >
          <path d="M6 7h12l-1 13H7L6 7Z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
        </svg>

        {/* Badge mobile */}
        {hasItems && (
          <span
            className="
              absolute -right-2 -top-2
              flex h-[18px] min-w-[18px]
              items-center justify-center
              rounded-full bg-rose
              px-1
              text-[0.6rem] font-semibold
              leading-none text-white
              shadow-sm
              transition-transform duration-200
              group-hover:scale-110
              sm:hidden
            "
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>

      {/* Texto desktop */}
      <span className="hidden lg:inline">
        Carrinho
      </span>

      {/* Badge desktop */}
      {hasItems && (
        <span
          className="
            hidden min-h-5 min-w-5
            items-center justify-center
            rounded-full bg-rose
            px-1.5
            text-[0.65rem] font-semibold
            leading-none text-white
            shadow-sm
            transition-transform duration-200
            group-hover:scale-105
            sm:flex
          "
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}