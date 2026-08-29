import type { Metadata } from "next";
import Link from "next/link";
import { about, contact } from "@/lib/config/site";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "Sobre",
  description: about.intro,
};

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
      <header>
        <p className="eyebrow">Quem somos</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Sobre a Rose Imports</h1>
        <div className="filete-left mt-3" aria-hidden />
      </header>

      <div className="mt-9 space-y-5 text-base leading-relaxed text-ink-soft">
        <p className="font-display text-xl text-ink">{about.intro}</p>
        {about.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <section className="mt-16">
        <SectionHeading eyebrow="O que nos guia" title="Nossos princípios" />
        <div className="mt-8 space-y-8">
          {about.pillars.map((pillar) => (
            <div key={pillar.title} className="border-l-2 border-rose-soft pl-5">
              <h3 className="font-display text-lg">{pillar.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{pillar.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="font-display text-xl">Venha conhecer</h2>
        <p className="mt-2 text-sm text-muted">
          Estamos em {contact.address.city} — {contact.address.state}.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/catalogo"
            className="bg-ink px-7 py-3.5 text-xs tracking-[0.18em] text-ivory uppercase transition-opacity hover:opacity-85"
          >
            Ver catálogo
          </Link>
          <Link
            href="/contato"
            className="border border-line-strong px-7 py-3.5 text-xs tracking-[0.18em] uppercase transition-colors hover:border-rose hover:text-rose"
          >
            Como chegar
          </Link>
        </div>
      </section>
    </div>
  );
}
