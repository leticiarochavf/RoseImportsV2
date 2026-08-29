import type { Metadata } from "next";
import { contact, delivery } from "@/lib/config/site";
import { whatsappContactUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contato e localização",
  description: `Onde encontrar a Rose Imports em ${contact.address.city}, horários de atendimento e WhatsApp.`,
};

export default function ContatoPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
      <header>
        <p className="eyebrow">Fale com a gente</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Contato e localização</h1>
        <div className="filete-left mt-3" aria-hidden />
      </header>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <section>
          <h2 className="eyebrow">Nossa sala</h2>
          <address className="mt-3 space-y-1 text-sm not-italic">
            <p>{contact.address.line1}</p>
            {contact.address.line2 && <p>{contact.address.line2}</p>}
            <p>
              {contact.address.city} — {contact.address.state}
            </p>
            {contact.address.zip && <p>{contact.address.zip}</p>}
          </address>

          {contact.address.mapsUrl && (
            <a
              href={contact.address.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-xs tracking-[0.14em] text-rose uppercase underline-offset-4 hover:underline"
            >
              Abrir no mapa
            </a>
          )}
        </section>

        <section>
          <h2 className="eyebrow">Atendimento</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {contact.hours.map((slot) => (
              <div key={slot.days} className="flex justify-between gap-4">
                <dt className="text-muted">{slot.days}</dt>
                <dd>{slot.time}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="eyebrow">WhatsApp</h2>
          <p className="mt-3 text-sm text-muted">
            É por aqui que finalizamos pedidos, combinamos entrega e tiramos
            dúvidas sobre fragrâncias.
          </p>
          <a
            href={whatsappContactUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block bg-ink px-7 py-3.5 text-xs tracking-[0.18em] text-ivory uppercase transition-opacity hover:opacity-85"
          >
            Chamar no WhatsApp
          </a>
        </section>

        <section>
          <h2 className="eyebrow">Instagram</h2>
          <p className="mt-3 text-sm text-muted">
            Novidades e lançamentos aparecem primeiro por lá.
          </p>
          <a
            href={`https://instagram.com/${contact.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block border border-line-strong px-7 py-3.5 text-xs tracking-[0.18em] uppercase transition-colors hover:border-rose hover:text-rose"
          >
            @{contact.instagram}
          </a>
        </section>
      </div>

      <section className="mt-14 border-t border-line pt-8">
        <h2 className="eyebrow">Entrega e retirada</h2>
        <div className="mt-3 space-y-2 text-sm text-ink-soft">
          <p>{delivery.pickupNote}</p>
          <p>
            Entregamos em {delivery.region}. {delivery.note}
          </p>
        </div>
      </section>
    </div>
  );
}
