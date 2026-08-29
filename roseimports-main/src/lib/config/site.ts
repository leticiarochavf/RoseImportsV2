export const site = {
  name: "Rose Imports",
  tagline: "Perfumes, cosméticos e eletrônicos importados",
  description:
    "Perfumes, cosméticos e eletrônicos importados na Rose Imports. Consulte disponibilidade, monte seu pedido e finalize o atendimento pelo WhatsApp.",
  url: "https://roseimports.com.br",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
} as const;

export const company = {
  legalName: "JS Serviços Digitais Ltda",
  cnpj: "22.278.319/0001-16",
  stateRegistration: "263.424.634",
} as const;

export const contact = {
  whatsappNumber: "5548999926337",
  instagram: "roseimports.oficial",
  address: {
    line1: "Rua Antônio Beretta, 195",
    line2: "Bairro Santa Cruz",
    city: "Forquilhinha",
    state: "SC",
    zip: "88.850-000",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Rua%20Ant%C3%B4nio%20Beretta%2C%20195%2C%20Santa%20Cruz%2C%20Forquilhinha%20SC",
  },
  hours: [
    { days: "Segunda a sexta", time: "08h às 18h" },
    { days: "Sábado", time: "08h às 12h" },
    { days: "Domingo", time: "Fechado" },
  ],
} as const;

export const delivery = {
  region: "Forquilhinha e região",
  note: "A taxa e o prazo de entrega são confirmados no atendimento antes do fechamento do pedido.",
  pickupNote:
    "A retirada é combinada diretamente com a Rose Imports após a finalização do pedido.",
  cardNote:
    "As condições de pagamento são confirmadas no atendimento antes da conclusão da compra.",
} as const;

export const faq = [
  {
    q: "Os produtos são originais?",
    a: "A Rose Imports trabalha com produtos comercializados como originais. Em caso de dúvida sobre um item específico, confirme procedência e disponibilidade com o atendimento antes da compra.",
  },
  {
    q: "Quais são as formas de pagamento?",
    a: "As formas e condições de pagamento disponíveis são confirmadas no atendimento no momento da finalização do pedido.",
  },
  {
    q: "Como funciona a entrega?",
    a: "Prazo, taxa e disponibilidade de entrega variam conforme a região e são confirmados antes do fechamento do pedido.",
  },
  {
    q: "Posso retirar meu pedido?",
    a: "Quando a retirada estiver disponível, o horário é combinado diretamente com o atendimento.",
  },
  {
    q: "Como sei se um produto está disponível?",
    a: "O site apresenta a disponibilidade cadastrada para cada versão. A confirmação final é feita antes do fechamento do pedido.",
  },
  {
    q: "Como funcionam trocas e devoluções?",
    a: "As condições dependem do motivo da solicitação e seguem a política de trocas e devoluções disponível no site.",
  },
] as const;

export const about = {
  intro:
    "A Rose Imports reúne perfumes, cosméticos e eletrônicos em uma experiência de compra simples, direta e próxima.",
  body: [
    "A proposta da loja é facilitar a escolha: informações essenciais, fotos claras e atendimento para concluir cada pedido com segurança.",
    "A vitrine foi pensada para deixar produtos, versões e disponibilidade fáceis de encontrar, com atendimento próximo para ajudar quando necessário.",
  ],
  pillars: [
    { title: "Produtos selecionados", text: "Uma curadoria organizada por categoria e perfil de compra." },
    { title: "Compra simples", text: "Menos etapas e informações essenciais em destaque." },
    { title: "Atendimento próximo", text: "Suporte para tirar dúvidas e concluir o pedido." },
  ],
} as const;
