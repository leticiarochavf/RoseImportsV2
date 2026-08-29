import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return <PolicyPage title="Termos de Uso" intro="Ao navegar e utilizar o site da Rose Imports, você concorda em usar as informações e funcionalidades de forma legítima e compatível com a finalidade da loja." sections={[
    { title: "Catálogo e disponibilidade", paragraphs: ["Produtos, imagens, preços, versões e disponibilidade podem ser atualizados. O pedido é validado com base nas informações disponíveis no momento da sua confirmação."] },
    { title: "Pedidos", paragraphs: ["Adicionar um produto ao carrinho não representa reserva definitiva de estoque. A conclusão do pedido depende da validação das informações e da disponibilidade do item."] },
    { title: "Uso do conteúdo", paragraphs: ["Marca, identidade visual, textos, fotografias próprias e demais conteúdos da Rose Imports não devem ser reproduzidos para fins comerciais sem autorização, ressalvados os direitos de terceiros sobre marcas e materiais de fabricantes."] },
    { title: "Uso adequado do site", bullets: ["Não tentar acessar áreas administrativas sem autorização.", "Não interferir no funcionamento ou segurança do site.", "Não fornecer informações falsas para criar pedidos ou prejudicar o atendimento."] },
    { title: "Atualizações", paragraphs: ["Estes termos podem ser atualizados quando houver mudança operacional, técnica ou legal relevante. A versão publicada nesta página é a referência vigente para o uso do site."] },
  ]} />;
}
