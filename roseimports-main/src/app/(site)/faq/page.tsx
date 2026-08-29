import type { Metadata } from "next";
import { faq } from "@/lib/config/site";
import { whatsappContactUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description:
    "Originalidade, formas de pagamento, entrega e retirada na Rose Imports.",
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
      <header>
        <p className="eyebrow">Tire suas dúvidas</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Perguntas frequentes</h1>
        <div className="filete-left mt-3" aria-hidden />
      </header>

      <dl className="mt-10 divide-y divide-line border-y border-line">
        {faq.map((item) => (
          <div key={item.q} className="py-7">
            <dt className="font-display text-lg">{item.q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-ink-soft">
              {item.a}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted">Ficou com outra dúvida?</p>
        <a
          href={whatsappContactUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block border border-line-strong px-7 py-3.5 text-xs tracking-[0.18em] uppercase transition-colors hover:border-rose hover:text-rose"
        >
          Perguntar no WhatsApp
        </a>
      </div>
    </div>
  );
}
