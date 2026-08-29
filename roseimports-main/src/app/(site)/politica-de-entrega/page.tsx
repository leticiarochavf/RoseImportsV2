import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = { title: "Política de Entrega" };

export default function EntregaPage() {
  return <PolicyPage title="Política de Entrega" intro="Prazos, taxas e formas de recebimento são apresentados ou confirmados de acordo com a região e a disponibilidade operacional no momento do pedido." sections={[
    { title: "Confirmação da entrega", paragraphs: ["A entrega só é considerada combinada após a confirmação das informações do pedido, da região atendida e das condições apresentadas ao cliente."] },
    { title: "Prazo", paragraphs: ["O prazo pode variar conforme endereço, disponibilidade do produto, horário de confirmação e modalidade de recebimento. Quando houver imprevisto relevante, o atendimento entra em contato para alinhar uma nova previsão."] },
    { title: "Recebimento", bullets: ["Confira o pedido no recebimento sempre que possível.", "Caso perceba embalagem violada, item divergente ou avaria aparente, comunique o atendimento.", "Mantenha telefone ou WhatsApp disponível quando a entrega exigir contato."] },
    { title: "Retirada", paragraphs: ["Quando a opção de retirada estiver disponível, local e horário são combinados com o atendimento após a finalização do pedido."] },
  ]} />;
}
