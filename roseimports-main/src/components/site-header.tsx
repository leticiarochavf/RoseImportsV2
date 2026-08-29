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

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur-md">
      <div className="border-b border-line bg-ivory-deep/55">
        <p className="mx-auto max-w-7xl px-5 py-2 text-center text-[0.65rem] tracking-[0.12em] text-muted uppercase">
          Rose Imports · perfumes, cosméticos e eletrônicos
        </p>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3.5 lg:gap-7">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="-ml-1 p-1 lg:hidden"
          aria-expanded={open}
          aria-controls="menu-principal"
        >
          <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <Logo variant="mark" className="shrink-0" />

        <form action="/catalogo" className="mx-auto hidden w-full max-w-xl lg:block">
          <label htmlFor="busca-header" className="sr-only">Buscar produtos</label>
          <div className="relative">
            <input
              id="busca-header"
              name="q"
              type="search"
              placeholder="O que você procura hoje?"
              className="w-full rounded-full border border-line bg-surface py-2.5 pr-11 pl-4 text-sm placeholder:text-muted focus:border-rose focus:outline-none"
            />
            <button type="submit" className="absolute top-1/2 right-4 -translate-y-1/2 text-muted transition-colors hover:text-rose" aria-label="Pesquisar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-4 lg:ml-0">
          <AdminLink className="hidden text-[0.65rem] tracking-[0.14em] text-muted uppercase transition-colors hover:text-rose xl:inline" />
          <CartLink />
        </div>
      </div>

      <nav className="hidden border-t border-line lg:block" aria-label="Principal">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-5 py-3">
          {NAV.map((item) => (
            <Link key={item.label} href={item.href} className="text-[0.7rem] tracking-[0.12em] uppercase transition-colors hover:text-rose">
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {open && (
        <nav id="menu-principal" className="border-t border-line bg-surface lg:hidden" aria-label="Principal">
          <div className="px-5 pt-4">
            <form action="/catalogo">
              <label htmlFor="busca-mobile" className="sr-only">Buscar produtos</label>
              <input id="busca-mobile" name="q" type="search" placeholder="Buscar produtos ou marcas" className="w-full rounded-full border border-line bg-ivory px-4 py-3 text-sm focus:border-rose focus:outline-none" />
            </form>
          </div>
          <ul className="mx-auto max-w-7xl px-5 py-3">
            {NAV.map((item) => (
              <li key={item.label} className="border-b border-line last:border-0">
                <Link href={item.href} className="block py-3.5 text-sm">{item.label}</Link>
              </li>
            ))}
            <li className="border-t border-line"><AdminLink className="block py-3.5 text-sm text-rose" /></li>
          </ul>
        </nav>
      )}
    </header>
  );
}
