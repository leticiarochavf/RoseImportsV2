"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { CartLink } from "@/components/cart-link";
import { AdminLink } from "@/components/admin-link";
import { FavoritesCount } from "@/components/favorites-count";
import { whatsappContactUrl } from "@/lib/whatsapp";

const NAV = [
  { href: "/catalogo?categoria=perfumes", label: "Perfumes" },
  { href: "/catalogo?categoria=cosmeticos", label: "Cosméticos" },
  { href: "/catalogo?genero=masculino", label: "Masculino" },
  { href: "/catalogo?genero=feminino", label: "Feminino" },
  { href: "/catalogo", label: "Todos" },
];

function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
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
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  function toggleSearch() {
    setMenuOpen(false);
    setSearchOpen((value) => !value);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur-md">
      <div className="bg-ink">
        <p className="mx-auto max-w-7xl px-3 py-[11px] text-center text-[0.54rem] font-medium uppercase tracking-[0.1em] text-gold-soft sm:px-6 sm:text-xs sm:tracking-[0.16em] lg:px-8">
          Rose Imports · perfumes e cosméticos
        </p>
      </div>

      <div className="bg-ivory">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:gap-5">
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setMenuOpen((value) => !value);
            }}
            className="
              -ml-1 flex h-10 w-10 shrink-0 items-center justify-center
              rounded-lg transition-all duration-200
              hover:bg-rose/10 hover:text-rose active:scale-95
              xl:hidden
            "
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
          >
            <span className="sr-only">
              {menuOpen ? "Fechar menu" : "Abrir menu"}
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
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>

          <Logo
            variant="mark"
            className="shrink-0"
            imageClassName="!h-11 sm:!h-[52px]"
          />

          <nav
            className="ml-3 hidden items-center gap-6 xl:flex"
            aria-label="Principal"
          >
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 hover:text-rose 2xl:text-[0.78rem]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleSearch}
              aria-label={searchOpen ? "Fechar busca" : "Abrir busca"}
              aria-expanded={searchOpen}
              aria-controls="busca-recolhida"
              className="
                hidden h-10 items-center justify-center gap-2 rounded-lg px-2.5
                text-sm font-medium text-muted transition-colors duration-200
                hover:bg-rose/10 hover:text-rose md:flex
              "
            >
              <SearchIcon />
              <span className="hidden 2xl:inline">Buscar</span>
            </button>

            <AdminLink
              className="
                hidden text-xs font-medium text-muted
                transition-colors duration-200 hover:text-rose xl:inline
              "
            />

            <Link
              href="/favoritos"
              aria-label="Favoritos"
              className="
                group flex h-10 items-center justify-center gap-2 rounded-lg px-2.5
                text-sm font-medium transition-all duration-200
                hover:bg-rose/10 hover:text-rose active:scale-[0.97]
                sm:px-3
              "
            >
              <span className="relative">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-200 group-hover:scale-110"
                  aria-hidden
                >
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                </svg>

                <FavoritesCount />
              </span>

              <span className="hidden 2xl:inline">Favoritos</span>
            </Link>

            <CartLink />

            <a
              href={whatsappContactUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="
                hidden min-h-10 shrink-0 items-center justify-center
                rounded-full bg-rose px-3 text-xs font-semibold text-white
                transition-colors duration-200 hover:bg-rose-deep
                md:inline-flex md:px-4 xl:min-h-11 xl:px-5
              "
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-line bg-ivory px-4 pb-3 md:hidden">
        <a
          href={whatsappContactUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-10 w-full items-center justify-center rounded-full bg-rose px-4 text-xs font-semibold text-white transition-colors duration-200 hover:bg-rose-deep"
        >
          Falar no WhatsApp
        </a>
      </div>

      {searchOpen && (
        <div id="busca-recolhida" className="border-t border-line bg-ivory">
          <form
            action="/catalogo"
            className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8"
          >
            <label htmlFor="busca-header" className="sr-only">
              Buscar produtos
            </label>

            <div className="relative ml-auto w-full max-w-2xl">
              <input
                ref={searchInputRef}
                id="busca-header"
                name="q"
                type="search"
                placeholder="O que você procura hoje?"
                className="
                  w-full rounded-full border border-line bg-surface
                  py-3 pl-5 pr-12 text-sm placeholder:text-muted
                  transition-all duration-200 hover:border-rose/50
                  focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/10
                "
              />

              <button
                type="submit"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-rose"
                aria-label="Pesquisar"
              >
                <SearchIcon />
              </button>
            </div>
          </form>
        </div>
      )}

      {menuOpen && (
        <nav
          id="menu-principal"
          className="border-t border-line bg-surface xl:hidden"
          aria-label="Principal"
        >
          <ul className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <li className="border-b border-line">
              <a
                href={whatsappContactUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-3.5 text-sm font-semibold text-rose transition-colors hover:text-rose-deep"
              >
                Falar no WhatsApp
              </a>
            </li>

            <li className="border-b border-line md:hidden">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="flex w-full items-center gap-3 py-3.5 text-left text-sm font-medium transition-colors hover:text-rose"
              >
                <SearchIcon />
                Buscar
              </button>
            </li>

            {NAV.map((item) => (
              <li key={item.label} className="border-b border-line">
                <Link
                  href={item.href}
                  className="block py-3.5 text-sm font-medium transition-colors hover:text-rose"
                >
                  {item.label}
                </Link>
              </li>
            ))}

            <li className="border-b border-line">
              <Link
                href="/favoritos"
                className="flex items-center gap-3 py-3.5 text-sm font-medium transition-colors hover:text-rose"
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

            <li>
              <AdminLink className="block py-3.5 text-sm font-medium text-rose" />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
