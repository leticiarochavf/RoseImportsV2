import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = { title: "Política de Privacidade", robots: { index: false } };

export default function PrivacidadePage() {
  return <PolicyPage title="Política de Privacidade" intro="Esta política explica de forma simples quais informações são utilizadas durante a navegação e a criação de pedidos na Rose Imports." sections={[
    { title: "Dados utilizados", paragraphs: ["Para criar e atender um pedido, podem ser utilizados dados necessários à identificação do cliente, à forma de recebimento escolhida, à região de entrega e aos itens selecionados."] },
    { title: "Finalidade", bullets: ["Atender e organizar pedidos.", "Viabilizar entrega ou retirada.", "Prestar suporte ao cliente.", "Manter registros operacionais e de venda necessários à atividade da loja."] },
    { title: "Carrinho e navegação", paragraphs: ["O carrinho utiliza o armazenamento do navegador para manter os produtos selecionados enquanto você navega. Essas informações permanecem no dispositivo até a finalização ou limpeza do carrinho."] },
    { title: "Armazenamento", paragraphs: ["O catálogo, as imagens e os registros operacionais do site utilizam infraestrutura do Supabase. O acesso administrativo é protegido por autenticação e regras de segurança no banco de dados."] },
    { title: "Direitos do titular", paragraphs: ["Solicitações relacionadas a acesso, correção ou eliminação de dados pessoais podem ser feitas pelos canais de atendimento da Rose Imports, observados os prazos e obrigações legais aplicáveis."] },
  ]} />;
}
