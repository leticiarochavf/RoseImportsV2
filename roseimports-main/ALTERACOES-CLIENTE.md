# Rose Imports — revisão UX/UI

## Direção adotada

A identidade visual existente foi preservada. As cores definidas em `src/app/globals.css` não foram alteradas e os arquivos `public/logo.png` e `public/logo-mark.png` permanecem exatamente os mesmos.

A reorganização foi feita com foco em leitura, navegação e compra: menos informação concorrendo ao mesmo tempo, mais espaço entre blocos e caminhos de navegação mais diretos.

## Alterações principais

- projeto mantido integralmente em TypeScript / Next.js;
- integração existente com Supabase preservada;
- upload de imagens via Supabase Storage preservado e melhorado com opção **Tornar capa**;
- Home reorganizada com hero único, categorias e carrosséis de **Mais vendidos** e **Em destaque**;
- Mais vendidos utiliza o histórico de pedidos pagos quando disponível;
- navegação principal para Perfumes, Cosméticos, Eletrônicos, Masculino e Feminino;
- busca no cabeçalho em desktop e dentro do menu em telas menores;
- catálogo com filtros existentes e menor ruído visual;
- cards de produto simplificados;
- página de produto com galeria de imagens selecionável e foco em variação, preço, estoque e ação de compra;
- carrinho simplificado, sem bloco de produtos recomendados;
- páginas de Política de Privacidade, Trocas e Devoluções, Política de Entrega e Termos de Uso;
- rodapé atualizado com endereço e dados empresariais informados pelo cliente;
- sitemap atualizado com as novas páginas.

## Dados institucionais aplicados

**Endereço**  
Rua Antônio Beretta, 195  
Bairro Santa Cruz  
Forquilhinha/SC, CEP 88.850-000

**Empresa**  
Rose Imports  
JS Serviços Digitais Ltda  
CNPJ: 22.278.319/0001-16  
Inscrição Estadual: 263.424.634

© 2026 Rose Imports. Todos os direitos reservados.

## Supabase

O projeto continua esperando as variáveis abaixo no `.env.local` do ambiente real:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID` (apenas para geração de tipos)

Por segurança, credenciais reais não foram adicionadas ao ZIP.
