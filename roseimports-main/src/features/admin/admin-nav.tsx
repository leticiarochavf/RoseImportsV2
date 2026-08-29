"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/features/admin/actions";

const NAV = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/estoque", label: "Estoque" },
  { href: "/admin/produtos", label: "Produtos" },
];

/**
 * Subnavegação do painel. Fica logo abaixo do header do site — o admin é
 * uma área do site, não outra aplicação. Por isso aqui não há logo nem
 * rodapé: quem cuida disso é o layout público. (§5)
 */
export function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2.5">
        <div className="flex items-center gap-6">
          <span className="eyebrow whitespace-nowrap">Administração</span>

          <nav className="hidden gap-6 sm:flex" aria-label="Painel">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`text-xs tracking-[0.12em] uppercase transition-colors ${
                  isActive(item.href) ? "text-rose" : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-muted md:inline">{userName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs tracking-[0.12em] text-muted uppercase hover:text-danger"
            >
              Sair
            </button>
          </form>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="sm:hidden"
            aria-expanded={open}
            aria-controls="menu-painel"
          >
            <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              aria-hidden
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="menu-painel" className="border-t border-line sm:hidden" aria-label="Painel">
          <ul className="mx-auto max-w-6xl px-5">
            {NAV.map((item) => (
              <li key={item.href} className="border-b border-line last:border-0">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`block py-3 text-sm ${
                    isActive(item.href) ? "text-rose" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
