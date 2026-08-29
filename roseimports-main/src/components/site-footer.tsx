import Link from "next/link";
import { Logo } from "@/components/logo";
import { company, contact, site } from "@/lib/config/site";
import { whatsappContactUrl } from "@/lib/whatsapp";

const CATALOG = [
  ["Perfumes", "/catalogo?categoria=perfumes"],
  ["Cosméticos", "/catalogo?categoria=cosmeticos"],
  ["Eletrônicos", "/catalogo?categoria=eletronicos"],
  ["Todos os produtos", "/catalogo"],
] as const;

const POLICIES = [
  ["Política de Privacidade", "/privacidade"],
  ["Trocas e Devoluções", "/trocas-e-devolucoes"],
  ["Política de Entrega", "/politica-de-entrega"],
  ["Termos de Uso", "/termos-de-uso"],
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-ink text-ivory">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:py-14 lg:px-8">
        {/* Bloco principal */}
        <div className="flex flex-col gap-8 border-b border-ivory/15 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Logo variant="type" className="max-w-44" />

            <p className="mt-4 max-w-md text-sm leading-6 text-ivory/60">
              {site.tagline}
            </p>

            <p className="mt-5 text-sm font-medium text-ivory">
              Precisa de ajuda com seu pedido?
            </p>

            <p className="mt-1 text-sm text-ivory/60">
              Fale com a gente. Estamos aqui para ajudar.
            </p>
          </div>

          {/* Redes / atendimento rápido */}
          <div className="flex flex-wrap gap-3">
            <a
              href={whatsappContactUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group inline-flex items-center gap-2.5
                rounded-lg border border-ivory/15
                px-4 py-2.5
                text-sm font-medium text-ivory
                transition-all duration-200
                hover:-translate-y-0.5
                hover:border-rose-soft/50
                hover:bg-ivory/5
                hover:text-rose-soft
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
                strokeLinejoin="round"
                aria-hidden
                className="transition-transform duration-200 group-hover:scale-105"
              >
                <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.7-4.7A8.8 8.8 0 1 1 21 11.5Z" />
                <path d="M8.5 8.5c.5 2 2 3.5 4 4.5" />
              </svg>

              WhatsApp
            </a>

            <a
              href={`https://instagram.com/${contact.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group inline-flex items-center gap-2.5
                rounded-lg border border-ivory/15
                px-4 py-2.5
                text-sm font-medium text-ivory
                transition-all duration-200
                hover:-translate-y-0.5
                hover:border-rose-soft/50
                hover:bg-ivory/5
                hover:text-rose-soft
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
                strokeLinejoin="round"
                aria-hidden
                className="transition-transform duration-200 group-hover:scale-105"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r=".5" fill="currentColor" />
              </svg>

              Instagram
            </a>
          </div>
        </div>

        {/* Navegação */}
        <div
          className="
            grid gap-10 py-10
            sm:grid-cols-2
            lg:grid-cols-4
            lg:gap-12
          "
        >
          {/* Catálogo */}
          <nav aria-label="Catálogo">
            <h2 className="text-xs font-medium uppercase tracking-[0.1em] text-ivory/45">
              Catálogo
            </h2>

            <ul className="mt-5 space-y-3 text-sm text-ivory/70">
              {CATALOG.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="
                      inline-block
                      transition-all duration-200
                      hover:translate-x-0.5
                      hover:text-rose-soft
                    "
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Atendimento */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.1em] text-ivory/45">
              Atendimento
            </h2>

            <div className="mt-5 space-y-3 text-sm text-ivory/70">
              <a
                href={whatsappContactUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  block transition-all duration-200
                  hover:translate-x-0.5
                  hover:text-rose-soft
                "
              >
                Falar pelo WhatsApp
              </a>

              <a
                href={`https://instagram.com/${contact.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  block transition-all duration-200
                  hover:translate-x-0.5
                  hover:text-rose-soft
                "
              >
                @{contact.instagram}
              </a>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.1em] text-ivory/45">
              Nossa loja
            </h2>

            <address className="mt-5 space-y-1 text-sm leading-6 text-ivory/70 not-italic">
              <p>{contact.address.line1}</p>
              <p>{contact.address.line2}</p>
              <p>
                {contact.address.city}/{contact.address.state}
              </p>
              <p>CEP {contact.address.zip}</p>
            </address>

            <a
              href={contact.address.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group mt-4 inline-flex items-center gap-2
                text-sm font-medium text-rose-soft
                transition-all duration-200
                hover:gap-2.5
              "
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>

              Ver no mapa

              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </a>
          </div>

          {/* Políticas */}
          <nav aria-label="Institucional">
            <h2 className="text-xs font-medium uppercase tracking-[0.1em] text-ivory/45">
              Institucional
            </h2>

            <ul className="mt-5 space-y-3 text-sm text-ivory/70">
              {POLICIES.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="
                      inline-block
                      transition-all duration-200
                      hover:translate-x-0.5
                      hover:text-rose-soft
                    "
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Informações legais */}
        <div className="border-t border-ivory/15 pt-6">
          <div className="flex flex-col gap-4 text-xs leading-5 text-ivory/40 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p>
                {company.legalName} · CNPJ {company.cnpj}
              </p>

              <p>
                Inscrição Estadual {company.stateRegistration}
              </p>
            </div>

            <p>
              © 2026 Rose Imports. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}