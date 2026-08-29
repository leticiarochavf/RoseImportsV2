import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = { title: "Trocas e Devoluções" };

export default function TrocasPage() {
  return <PolicyPage title="Trocas e Devoluções" intro="As solicitações de troca ou devolução são analisadas de acordo com o tipo de produto, o motivo apresentado e as regras aplicáveis à compra." sections={[
    { title: "Antes de solicitar", bullets: ["Mantenha o produto, acessórios e embalagem nas melhores condições possíveis.", "Separe o comprovante ou número do pedido.", "Entre em contato informando o motivo da solicitação e, quando necessário, envie fotos do produto recebido."] },
    { title: "Produto com divergência ou avaria", paragraphs: ["Se o pedido chegar com item diferente do comprado ou apresentar avaria aparente, entre em contato assim que identificar o problema para que a equipe possa orientar os próximos passos."] },
    { title: "Direito de arrependimento", paragraphs: ["Nas compras realizadas fora do estabelecimento comercial, os pedidos de arrependimento são tratados conforme os direitos previstos na legislação aplicável e as condições do produto devolvido."] },
    { title: "Itens de uso pessoal", paragraphs: ["Por questões de higiene e segurança, cosméticos, perfumes e outros itens de uso pessoal podem exigir análise específica quando houver indícios de uso, violação de lacre ou alteração das condições originais."] },
    { title: "Reembolso ou substituição", paragraphs: ["Depois da análise da solicitação e do produto, a Rose Imports informa a alternativa aplicável ao caso, como substituição, crédito ou reembolso, quando cabível."] },
  ]} />;
}
