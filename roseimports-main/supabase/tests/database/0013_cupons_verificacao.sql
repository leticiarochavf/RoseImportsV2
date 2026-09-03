-- =============================================================
-- Verificação pós-aplicação — cupons (0010, 0011, 0013)
--
-- SOMENTE LEITURA. Não cria, não altera e não apaga nada. Pode rodar no
-- SQL Editor do Supabase, inclusive em produção.
--
-- Toda linha do resultado precisa vir com situacao = 'OK'. Qualquer
-- 'FALTANDO' aponta objeto que não chegou ao banco.
-- =============================================================

with esperado (item, situacao) as (

  -- ---------- tabelas ----------
  select 'tabela influencers', case when to_regclass('public.influencers') is null
    then 'FALTANDO' else 'OK' end
  union all
  select 'tabela coupons', case when to_regclass('public.coupons') is null
    then 'FALTANDO' else 'OK' end

  -- ---------- colunas de cupom em orders ----------
  union all
  select 'orders.' || c.nome, case when exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'orders' and column_name = c.nome
  ) then 'OK' else 'FALTANDO' end
  from (values
    ('coupon_id'),
    ('coupon_code_snapshot'),
    ('coupon_discount_percent_snapshot'),
    ('discount_cents'),
    ('total_cents')
  ) as c(nome)

  -- total_cents precisa ser coluna gerada, não escrita pela aplicação
  union all
  select 'orders.total_cents é coluna gerada', case when exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'orders'
       and column_name = 'total_cents' and is_generated = 'ALWAYS'
  ) then 'OK' else 'FALTANDO' end

  -- ---------- constraints de sanidade ----------
  union all
  select 'constraint ' || c.nome, case when exists (
    select 1 from pg_constraint where conname = c.nome
  ) then 'OK' else 'FALTANDO' end
  from (values
    ('chk_coupon_code_normalized'),
    ('chk_coupon_period'),
    ('chk_coupon_confirmed_le_reserved'),
    ('chk_coupon_reserved_le_max'),
    ('chk_order_discount_not_above_subtotal'),
    ('chk_order_coupon_snapshot_complete')
  ) as c(nome)

  union all
  select 'desconto entre 1 e 100 (check da coluna)', case when exists (
    select 1 from pg_constraint
     where conrelid = 'public.coupons'::regclass
       and pg_get_constraintdef(oid) ilike '%discount_percent%1%100%'
  ) then 'OK' else 'FALTANDO' end

  union all
  select 'índice único de código', case when exists (
    select 1 from pg_indexes
     where schemaname = 'public' and indexname = 'uq_coupons_code'
  ) then 'OK' else 'FALTANDO' end

  -- ---------- funções e trigger ----------
  union all
  select 'função create_preorder', case when exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'create_preorder'
  ) then 'OK' else 'FALTANDO' end

  union all
  select 'mark_order_paid confirma o cupom', case when exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'mark_order_paid'
       and pg_get_functiondef(p.oid) like '%uses_confirmed%'
  ) then 'OK' else 'FALTANDO' end

  union all
  select 'trigger de devolução no cancelamento', case when exists (
    select 1 from pg_trigger where tgname = 'trg_orders_release_coupon'
  ) then 'OK' else 'FALTANDO' end

  -- ---------- views de desempenho ----------
  union all
  select 'view ' || v.nome, case when exists (
    select 1 from pg_views where schemaname = 'public' and viewname = v.nome
  ) then 'OK' else 'FALTANDO' end
  from (values ('coupon_performance'), ('influencer_performance')) as v(nome)

  union all
  select 'views com security_invoker', case when (
    select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname in ('coupon_performance','influencer_performance')
       and array_to_string(c.reloptions, ',') like '%security_invoker=%on%'
  ) = 2 then 'OK' else 'FALTANDO' end

  -- ---------- RLS ----------
  union all
  select 'RLS ligada em ' || t.nome, case when exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = t.nome and c.relrowsecurity
  ) then 'OK' else 'FALTANDO' end
  from (values ('coupons'), ('influencers')) as t(nome)

  union all
  select 'policy admin em ' || p.nome, case when exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = p.nome
  ) then 'OK' else 'FALTANDO' end
  from (values ('coupons'), ('influencers')) as p(nome)

  -- ---------- permissões ----------
  union all
  select 'anon NÃO executa create_preorder', case when has_function_privilege(
    'anon', 'public.create_preorder(text,text,text,text,jsonb,text)', 'execute'
  ) then 'FALTANDO' else 'OK' end

  union all
  select 'service_role executa create_preorder', case when has_function_privilege(
    'service_role', 'public.create_preorder(text,text,text,text,jsonb,text)', 'execute'
  ) then 'OK' else 'FALTANDO' end

  union all
  select 'anon NÃO lê coupons', case when has_table_privilege(
    'anon', 'public.coupons', 'select'
  ) then 'ATENÇÃO: anon tem SELECT (a RLS ainda bloqueia, mas revise)' else 'OK' end
)

select item, situacao
  from esperado
 order by (situacao <> 'OK') desc, item;
