-- =============================================================
-- Rose Imports — 0005_seed_base
--
-- Só taxonomia. Nenhum produto fictício: os produtos reais são
-- cadastrados pelo admin. (§67)
-- =============================================================

insert into public.categories (name, slug, sort_order) values
  ('Perfumes',    'perfumes',    1),
  ('Cosméticos',  'cosmeticos',  2),
  ('Eletrônicos', 'eletronicos', 3),
  ('Acessórios',  'acessorios',  4)
on conflict (slug) do nothing;

-- Lista inicial, não fechada: novas famílias entram pelo admin. (§12)
insert into public.olfactory_families (name, slug, sort_order) values
  ('Floral',      'floral',      1),
  ('Cítrico',     'citrico',     2),
  ('Amadeirado',  'amadeirado',  3),
  ('Ambarado',    'ambarado',    4),
  ('Aromático',   'aromatico',   5),
  ('Frutado',     'frutado',     6),
  ('Oriental',    'oriental',    7),
  ('Gourmand',    'gourmand',    8),
  ('Chipre',      'chipre',      9),
  ('Fougère',     'fougere',    10)
on conflict (slug) do nothing;
