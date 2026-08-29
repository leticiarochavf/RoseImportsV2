import Link from "next/link";
import { Logo } from "@/components/logo";
import { company, contact, site } from "@/lib/config/site";
import { whatsappContactUrl } from "@/lib/whatsapp";

const POLICIES = [
  ["Política de Privacidade", "/privacidade"],
  ["Trocas e Devoluções", "/trocas-e-devolucoes"],
  ["Política de Entrega", "/politica-de-entrega"],
  ["Termos de Uso", "/termos-de-uso"],
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-ink text-ivory">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_0.9fr]">
          <div>
            <Logo variant="type" className="max-w-44" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ivory/60">{site.tagline}</p>
            <div className="mt-5 flex gap-4 text-sm text-ivory/70">
              <a href={whatsappContactUrl()} target="_blank" rel="noopener noreferrer" className="hover:text-rose-soft">WhatsApp</a>
              <a href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-rose-soft">Instagram</a>
            </div>
          </div>

          <div>
            <h2 className="text-xs tracking-[0.14em] text-ivory/55 uppercase">Onde estamos</h2>
            <address className="mt-4 space-y-1 text-sm leading-relaxed text-ivory/78 not-italic">
              <p>{contact.address.line1}</p>
              <p>{contact.address.line2}</p>
              <p>{contact.address.city}/{contact.address.state}, CEP {contact.address.zip}</p>
            </address>
            <a href={contact.address.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs text-rose-soft hover:underline">Ver localização</a>
          </div>

          <div>
            <h2 className="text-xs tracking-[0.14em] text-ivory/55 uppercase">Rose Imports</h2>
            <div className="mt-4 space-y-1 text-sm leading-relaxed text-ivory/78">
              <p>{company.legalName}</p>
              <p>CNPJ: {company.cnpj}</p>
              <p>Inscrição Estadual: {company.stateRegistration}</p>
            </div>
          </div>

          <nav aria-label="Políticas">
            <h2 className="text-xs tracking-[0.14em] text-ivory/55 uppercase">Políticas</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-ivory/78">
              {POLICIES.map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-rose-soft">{label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-ivory/15 pt-6 text-xs text-ivory/45">
          © 2026 Rose Imports. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
