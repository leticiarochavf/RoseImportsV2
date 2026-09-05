# Rose Imports — regras para agentes

Regras estabelecidas pelo cliente. Valem para qualquer agente que trabalhe neste repositório.

## Git

- O padrão deste repositório é trabalhar diretamente na branch `main`.
- **Nunca criar branch** sem autorização ou pedido explícito.
- Sob ordem expressa do responsável pelo projeto, alterações e commits devem ser realizados diretamente na `main`; essa ordem prevalece sobre orientações genéricas de criar uma branch nova.
- Não commitar nem fazer push sem pedido.

## Banco de dados

- **Nunca alterar produção.** Migration é arquivo em `supabase/migrations/`, aplicada pelo cliente.
- Não usar o projeto Supabase que era usado antes para testes (alvo de `scripts/test-bulk-import-pgtap.ts`). Sem alvo novo indicado, testes que exigem Postgres não são executados — escrever o arquivo e avisar que ficou sem rodar.
- Dinheiro sempre `integer` em centavos, do banco até a UI.

## Escopo

- **Não inventar dado que não foi especificado.** Na dúvida sobre uma regra de negócio, perguntar antes de decidir.
- Reaproveitar componentes e padrões visuais existentes. Sem biblioteca nova.

## Verificação

Ao fim de cada fase de trabalho: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
