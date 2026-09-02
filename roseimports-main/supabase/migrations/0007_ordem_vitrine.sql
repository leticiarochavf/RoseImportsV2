-- =============================================================
-- 0007 — ordem da vitrine
--
-- A ordem em que os produtos aparecem no catálogo passa a ser
-- definida no painel, arrastando os itens.
--
-- A coluna aceita nulo de propósito: produto recém-cadastrado nasce
-- sem posição e cai no fim da vitrine (ORDER BY ... NULLS LAST), nunca
-- no começo. Só quem foi arrastado ganha um número.
--
-- Desativar ou excluir um produto abre um vão na sequência
-- (1, 2, 5, 9...), e isso não é problema: o que ordena é a comparação
-- entre as posições, não a continuidade delas.
-- =============================================================

alter table public.products
  add column if not exists showcase_order integer;

comment on column public.products.showcase_order is
  'Posição na vitrine, definida por arrastar no painel. Nulo = sem posição, vai para o fim.';

-- A vitrine lê sempre nesta ordem; o índice evita varrer a tabela.
create index if not exists idx_products_showcase_order
  on public.products (showcase_order nulls last)
  where active;
