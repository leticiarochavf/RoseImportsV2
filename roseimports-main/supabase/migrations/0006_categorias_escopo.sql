-- =============================================================
-- 0006 — escopo real do catálogo
--
-- A loja vende perfumes, body splash e cosméticos. Eletrônicos e
-- acessórios saíram do escopo, mas continuavam ativos no filtro do
-- catálogo — levando a cliente a uma vitrine vazia.
--
-- Desativar em vez de apagar: products.category_id é `on delete
-- restrict`, e o histórico de produtos antigos continua válido.
-- =============================================================

update public.categories
   set active = false
 where slug in ('eletronicos', 'acessorios');
