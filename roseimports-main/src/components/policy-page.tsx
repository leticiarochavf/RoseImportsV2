import Link from "next/link";

export type PolicySection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export function PolicyPage({ title, eyebrow = "Políticas Rose Imports", intro, sections }: { title: string; eyebrow?: string; intro: string; sections: PolicySection[] }) {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:py-16">
      <nav aria-label="Trilha" className="text-xs text-muted"><Link href="/" className="hover:text-rose">Início</Link><span className="mx-2">/</span><span>{title}</span></nav>
      <header className="mt-7 max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-muted">{intro}</p>
      </header>

      <div className="mt-10 divide-y divide-line rounded-lg border border-line bg-surface px-5 sm:px-8">
        {sections.map((section) => (
          <section key={section.title} className="py-7 sm:py-8">
            <h2 className="text-lg">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-ink-soft">{paragraph}</p>)}
            {section.bullets && <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-ink-soft">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
          </section>
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">Última atualização: agosto de 2026. Em caso de dúvida sobre uma situação específica, fale com o atendimento antes de concluir o pedido.</p>
    </div>
  );
}
