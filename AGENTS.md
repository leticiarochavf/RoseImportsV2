# Rose Imports — instruções para agentes

## Regras obrigatórias

- Trabalhe sempre em uma branch nova; nunca faça alterações diretamente na branch principal.
- Nunca altere dados de produção e nunca rode migrations contra o banco de produção.
- Reutilize models, serviços, rotas, server actions e componentes existentes antes de criar novas abstrações.
- Não invente dados comerciais ou fiscais ausentes, incluindo preço, custo, preço promocional, código de barras/GTIN, NCM, CEST, peso, fabricante, país de origem e descrição comercial.
- Produtos sem os dados obrigatórios para publicação devem permanecer inativos/como rascunho até revisão humana.
- Ao final de cada etapa, execute lint, typecheck e os testes disponíveis e informe arquivos criados/modificados, migrations, comandos e resultados.

## Estrutura do repositório

- A raiz Git é este diretório; a aplicação fica em `roseimports-main/`.
- Execute os comandos npm dentro de `roseimports-main/`.
- Stack: Next.js 15 com App Router, React 19, TypeScript estrito, Tailwind CSS 4, Zod 3 e Supabase.
- Persistência: PostgreSQL do Supabase; não há ORM. O acesso usa `@supabase/ssr`/`@supabase/supabase-js` e os tipos gerados em `src/types/database.ts`.
- Migrations SQL versionadas ficam em `roseimports-main/supabase/migrations/`.

## Produtos e estoque

- `public.products` é o cadastro principal. Os campos atuais são nome, slug único, marca opcional, categoria obrigatória, tipo, gênero/família opcionais, descrição opcional e flags de publicação/vitrine.
- `public.product_variants` guarda versão, volume, tipo (`full`/`decant`), preço em centavos, estoque, atividade e ordem. O estoque pertence à variante, não diretamente ao produto.
- Não existem SKU, GTIN, NCM ou CEST no schema. A migration `0008_cadastro_lote_produtos.sql` adiciona concentração e indicador de kit à variante e componentes normalizados em `product_variant_kit_items`.
- `products.active = false` é o mecanismo atual de rascunho. O fluxo manual cria o produto inativo e só o publica depois de haver variante ativa e imagem.
- A partir da migration `0008`, `product_variants.price_cents` pode ser nulo somente quando a variante está inativa. Nunca use preço fictício para contornar a revisão; variantes ativas continuam exigindo preço positivo.
- Não existe tabela/ledger de movimentações de estoque. Edições administrativas sobrescrevem `stock_quantity`; a baixa de venda é atômica na função PostgreSQL `mark_order_paid()`.
- Para operações de lote que precisem ser atômicas, use uma função PostgreSQL/RPC versionada em migration, porque várias chamadas encadeadas via cliente Supabase não formam uma única transação.
- Confirmações em lote usam `confirm_bulk_product_import()` e registram chave/hash/resultados em `bulk_product_imports`; a aplicação não deve substituir a RPC por gravações parciais.

## Admin, autenticação e segurança

- O admin usa páginas em `src/app/(site)/admin/` e funcionalidades em `src/features/admin/`.
- Cada página protegida chama `requireAdminUser()`. Server actions chamam o mesmo controle por meio de `requireAdmin()`.
- Um usuário é admin quando tem sessão válida e uma linha em `public.profiles`; não há níveis de permissão no MVP.
- RLS usa `public.is_admin()` para escrita administrativa em produtos e variantes. A autorização deve continuar validada no backend, nunca apenas na UI.
- A navegação principal do admin fica em `src/features/admin/admin-nav.tsx`. A área herda header, rodapé, tipografia e tokens visuais do site.
- O padrão de mutação atual é Server Action com validação Zod e retorno discriminado `{ ok, message | error }`.

## UI e validação

- Reutilize os tokens/classes definidos em `src/app/globals.css` e os padrões das páginas e componentes de admin existentes; não adicione biblioteca visual sem necessidade.
- O projeto não possui sistema global de toast. Os componentes atuais usam `useTransition` e mensagens locais de sucesso/erro.
- Slugs usam `slugify()` de `src/lib/slug.ts`, que normaliza acentos, caixa e separadores.
- Schemas Zod compartilhados ficam em `src/lib/validation/schemas.ts`.

## Comandos de verificação

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:bulk-local` (exige Supabase local; o script recusa hosts não locais)
- `npm run build`
- O projeto usa Vitest para testes unitários; novos parsers e regras de negócio devem seguir o ciclo test-first.
