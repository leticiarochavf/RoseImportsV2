"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { CartLink } from "@/components/cart-link";
import { AdminLink } from "@/components/admin-link";

const NAV = [
  { href: "/catalogo?categoria=perfumes", label: "Perfumes" },
  { href: "/catalogo?categoria=cosmeticos", label: "Cosméticos" },
  { href: "/catalogo?categoria=eletronicos", label: "Eletrônicos" },
  { href: "/catalogo?genero=masculino", label: "Masculino" },
  { href: "/catalogo?genero=feminino", label: "Feminino" },
  { href: "/catalogo", label: "Todos" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur-md">
      {/* Faixa superior */}
      <div className="border-b border-line bg-ivory-deep/55">
        <p className="mx-auto max-w-7xl px-5 py-2 text-center text-xs text-muted">
          Rose Imports · perfumes, cosméticos e eletrônicos
        </p>
      </div>

      {/* Header principal */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-5 lg:gap-6">
        {/* Menu mobile */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="
            -ml-1 flex h-10 w-10 items-center justify-center
            rounded-lg
            transition-all duration-200
            hover:bg-rose/10 hover:text-rose
            active:scale-95
            lg:hidden
          "
          aria-expanded={open}
          aria-controls="menu-principal"
        >
          <span className="sr-only">
            {open ? "Fechar menu" : "Abrir menu"}
          </span>

          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        {/* Logo */}
        <Logo variant="mark" className="shrink-0" />

        {/* Busca desktop */}
        <form
          action="/catalogo"
          className="mx-auto hidden w-full max-w-xl lg:block"
        >
          <label htmlFor="busca-header" className="sr-only">
            Buscar produtos
          </label>

          <div className="relative">
            <input
              id="busca-header"
              name="q"
              type="search"
              placeholder="O que você procura hoje?"
              className="
                w-full rounded-full border border-line
                bg-surface py-2.5 pl-4 pr-11
                text-sm
                transition-all duration-200
                placeholder:text-muted
                hover:border-rose/50
                focus:border-rose
                focus:outline-none
                focus:ring-2
                focus:ring-rose/10
              "
            />

            <button
              type="submit"
              className="
                absolute right-4 top-1/2
                -translate-y-1/2
                text-muted
                transition-all duration-200
                hover:scale-105 hover:text-rose
              "
              aria-label="Pesquisar"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </div>
        </form>

        {/* Ações */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:ml-0">
          <AdminLink
            className="
              hidden text-xs font-medium text-muted
              transition-colors duration-200
              hover:text-rose
              xl:inline
            "
          />

          {/* Favoritos */}
          <Link
            href="/favoritos"
            aria-label="Favoritos"
            className="
              group flex h-10 items-center justify-center gap-2
              rounded-lg px-2.5
              text-sm font-medium
              transition-all duration-200
              hover:bg-rose/10 hover:text-rose
              active:scale-[0.97]
              sm:px-3
            "
          >
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
                group-hover:scale-110
              "
              aria-hidden
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
            </svg>

            <span className="hidden lg:inline">
              Favoritos
            </span>
          </Link>

          {/* Carrinho */}
          <CartLink />
        </div>
      </div>

      {/* Navegação desktop */}
      <nav
        className="hidden border-t border-line lg:block"
        aria-label="Principal"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-5 py-3">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="
                relative text-sm font-medium
                transition-colors duration-200
                hover:text-rose
              "
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Menu mobile */}
      {open && (
        <nav
          id="menu-principal"
          className="border-t border-line bg-surface lg:hidden"
          aria-label="Principal"
        >
          {/* Busca */}
          <div className="px-5 pt-4">
            <form action="/catalogo">
              <label htmlFor="busca-mobile" className="sr-only">
                Buscar produtos
              </label>

              <div className="relative">
                <input
                  id="busca-mobile"
                  name="q"
                  type="search"
                  placeholder="Buscar produtos ou marcas"
                  className="
                    w-full rounded-full border border-line
                    bg-ivory px-4 py-3 pr-11
                    text-sm
                    transition-all duration-200
                    focus:border-rose
                    focus:outline-none
                    focus:ring-2
                    focus:ring-rose/10
                  "
                />

                <button
                  type="submit"
                  aria-label="Pesquisar"
                  className="
                    absolute right-4 top-1/2
                    -translate-y-1/2
                    text-muted
                  "
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Links */}
          <ul className="mx-auto max-w-7xl px-5 py-3">
            {NAV.map((item) => (
              <li
                key={item.label}
                className="border-b border-line last:border-0"
              >
                <Link
                  href={item.href}
                  className="
                    block py-3.5 text-sm font-medium
                    transition-colors
                    hover:text-rose
                  "
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {/* Favoritos no menu mobile */}
            <li className="border-t border-line">
              <Link
                href="/favoritos"
                className="
                  flex items-center gap-3 py-3.5
                  text-sm font-medium
                  transition-colors
                  hover:text-rose
                "
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                </svg>

                Favoritos
              </Link>
            </li>

            <li className="border-t border-line">
              <AdminLink className="block py-3.5 text-sm font-medium text-rose" />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}