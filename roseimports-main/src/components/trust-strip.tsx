const ITEMS = [
  ["Compra simples", "Informações essenciais para decidir sem ruído."],
  ["Informações claras", "Versões e disponibilidade reunidas em um só lugar."],
  ["Atendimento próximo", "Suporte para dúvidas e fechamento do pedido."],
  ["Fotos do produto", "Galeria organizada para visualizar cada item melhor."],
] as const;

export function TrustStrip() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-5 gap-y-7 px-5 py-7 lg:grid-cols-4 lg:gap-0">
        {ITEMS.map(([title, text], index) => (
          <div
            key={title}
            className={`lg:px-7 ${index > 0 ? "lg:border-l lg:border-line" : ""}`}
          >
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
