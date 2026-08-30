import Link from "next/link";
import { Logo } from "@/components/logo";
import { company, contact, site } from "@/lib/config/site";
import { whatsappContactUrl } from "@/lib/whatsapp";

const CATALOG = [
  ["Perfumes", "/catalogo?categoria=perfumes"],
  ["Cosméticos", "/catalogo?categoria=cosmeticos"],
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
    <footer className="mt-14 border-t border-line bg-ink text-ivory">
      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-6 border-b border-ivory/15 pb-7 lg:grid-cols-12 lg:items-center lg:gap-8">
          <div className="min-w-0 lg:col-span-4">
            <Logo variant="type" className="max-w-44" />

            <p className="mt-3 max-w-md text-sm leading-6 text-ivory/60">
              {site.tagline}
            </p>
          </div>

          <div className="min-w-0 lg:col-span-4 lg:border-l lg:border-ivory/15 lg:pl-8">
            <p className="text-sm font-medium text-ivory">
              Precisa de ajuda com seu pedido?
            </p>

            <p className="mt-1 text-sm text-ivory/60">
              Fale com a gente. Estamos aqui para ajudar.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
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
              Instagram
            </a>
          </div>
        </div>

        <div className="grid justify-items-center gap-x-8 gap-y-9 py-8 text-center sm:grid-cols-2 lg:grid-cols-12 xl:gap-x-10">
          <nav
            aria-label="Catálogo"
            className="w-full min-w-0 lg:col-span-3 lg:w-fit lg:text-left"
          >
            <h2 className="text-xs font-medium uppercase tracking-[0.1em] text-gold-soft/80">
              Catálogo
            </h2>

            <ul className="mt-5 space-y-3 text-sm text-ivory/70">
              {CATALOG.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-block transition-all duration-200 hover:translate-x-0.5 hover:text-rose-soft"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="w-full min-w-0 lg:col-span-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.1em] text-gold-soft/80">
              Atendimento
            </h2>

            <div className="mt-5 space-y-3 text-sm text-ivory/70">
              <a
                href={whatsappContactUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-all duration-200 hover:translate-x-0.5 hover:text-rose-soft"
              >
                Falar pelo WhatsApp
              </a>

              <a
                href={`https://instagram.com/${contact.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-all duration-200 hover:translate-x-0.5 hover:text-rose-soft"
              >
                @{contact.instagram}
              </a>
            </div>
          </div>

          <div className="w-full min-w-0 lg:col-span-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.1em] text-gold-soft/80">
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
              Ver no mapa
              <span aria-hidden>→</span>
            </a>
          </div>

          <nav
            aria-label="Institucional"
            className="w-full min-w-0 lg:col-span-3 lg:w-fit lg:text-right"
          >
            <h2 className="text-xs font-medium uppercase tracking-[0.1em] text-gold-soft/80">
              Institucional
            </h2>

            <ul className="mt-5 space-y-3 text-sm text-ivory/70">
              {POLICIES.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-block transition-all duration-200 hover:translate-x-0.5 hover:text-rose-soft"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-ivory/15 pt-5">
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
