begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

-- Administrador local: mark_order_paid() exige is_admin().
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '90000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'cupons-local@rose.invalid',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.profiles (id, full_name)
values ('90000000-0000-4000-8000-000000000001', 'Teste local de cupons');

-- Produto e variante com estoque, para o pedido poder ser pago.
insert into public.products (
  id, name, slug, brand, category_id, product_type, active
) values (
  '91000000-0000-4000-8000-000000000001',
  'Lattafa Jasoor',
  'lattafa-jasoor-cupom-test',
  'Lattafa',
  (select id from public.categories where slug = 'perfumes'),
  'perfume',
  true
);

insert into public.product_variants (
  id, product_id, label, price_cents, stock_quantity, active
) values (
  '92000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  'EDP 100 ml',
  10000,
  50,
  true
);

insert into public.influencers (id, name, handle)
values ('93000000-0000-4000-8000-000000000001', 'Duda', '@duda');

insert into public.coupons (id, code, discount_percent, influencer_id, max_uses)
values (
  '94000000-0000-4000-8000-000000000001',
  'DUDA10', 10, '93000000-0000-4000-8000-000000000001', 5
);

insert into public.coupons (id, code, discount_percent, expires_at)
values (
  '94000000-0000-4000-8000-000000000002',
  'EXPIRADO', 20, now() - interval '1 day'
);

insert into public.coupons (id, code, discount_percent, max_uses, uses_reserved)
values (
  '94000000-0000-4000-8000-000000000003',
  'ESGOTADO', 15, 2, 2
);

insert into public.coupons (id, code, discount_percent, active)
values (
  '94000000-0000-4000-8000-000000000004',
  'DESLIGADO', 25, false
);

insert into public.coupons (id, code, discount_percent, starts_at)
values (
  '94000000-0000-4000-8000-000000000005',
  'FUTURO', 30, now() + interval '1 day'
);

-- Um item de 2 x R$ 100,00 = R$ 200,00 de subtotal em todos os testes.
create temporary view itens_pedido as
  select jsonb_build_array(jsonb_build_object(
    'variantId',      '92000000-0000-4000-8000-000000000001',
    'productId',      '91000000-0000-4000-8000-000000000001',
    'productName',    'Lattafa Jasoor',
    'variantLabel',   'EDP 100 ml',
    'unitPriceCents', 10000,
    'quantity',       2
  )) as itens;

-- =============================================================
-- Normalização do código
-- =============================================================

create temporary table pedido_minusculo as
  select * from public.create_preorder(
    'Cliente Um', 'retirada', null, 'pix',
    (select itens from itens_pedido),
    '  duda10 '
  );

select is(
  (select coupon_code from pedido_minusculo),
  'DUDA10',
  'código digitado em minúsculas e com espaço acha o mesmo cupom'
);

select is(
  (select subtotal_cents from pedido_minusculo),
  20000,
  'subtotal recalculado a partir dos itens'
);

select is(
  (select discount_cents from pedido_minusculo),
  2000,
  'desconto de 10% calculado pelo banco'
);

select is(
  (select total_cents from pedido_minusculo),
  18000,
  'total é subtotal menos desconto'
);

select is(
  (select uses_reserved from public.coupons where code = 'DUDA10'),
  1,
  'criar o pedido reserva um uso'
);

select is(
  (select uses_confirmed from public.coupons where code = 'DUDA10'),
  0,
  'pré-pedido não conta como venda confirmada'
);

-- =============================================================
-- Recusas na confirmação do pedido
-- =============================================================

select throws_ok(
  $$ select public.create_preorder('Cliente', 'retirada', null, 'pix',
       (select itens from itens_pedido), 'EXPIRADO') $$,
  'P0001', 'coupon_expired',
  'cupom expirado é recusado'
);

select throws_ok(
  $$ select public.create_preorder('Cliente', 'retirada', null, 'pix',
       (select itens from itens_pedido), 'ESGOTADO') $$,
  'P0001', 'coupon_exhausted',
  'cupom no limite de usos é recusado'
);

select throws_ok(
  $$ select public.create_preorder('Cliente', 'retirada', null, 'pix',
       (select itens from itens_pedido), 'DESLIGADO') $$,
  'P0001', 'coupon_inactive',
  'cupom desativado é recusado'
);

select throws_ok(
  $$ select public.create_preorder('Cliente', 'retirada', null, 'pix',
       (select itens from itens_pedido), 'FUTURO') $$,
  'P0001', 'coupon_not_started',
  'cupom agendado ainda não vale'
);

select throws_ok(
  $$ select public.create_preorder('Cliente', 'retirada', null, 'pix',
       (select itens from itens_pedido), 'NAOEXISTE') $$,
  'P0001', 'coupon_not_found',
  'código inexistente é recusado'
);

select is(
  (select uses_reserved from public.coupons where code = 'ESGOTADO'),
  2,
  'pedido recusado não incrementa contador'
);

-- =============================================================
-- Limite máximo: nem o banco deixa passar
-- =============================================================

select throws_ok(
  $$ update public.coupons set uses_reserved = 3 where code = 'ESGOTADO' $$,
  '23514',
  null,
  'constraint impede reserva acima do limite'
);

-- =============================================================
-- Pagamento confirma o uso
-- =============================================================

set local role postgres;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select public.mark_order_paid((select order_id from pedido_minusculo)) $$,
  'pedido com cupom pode ser marcado como pago'
);

select is(
  (select uses_confirmed from public.coupons where code = 'DUDA10'),
  1,
  'pagamento confirma o uso do cupom'
);

-- =============================================================
-- Cancelar antes de pagar devolve a vaga
-- =============================================================

create temporary table pedido_cancelado as
  select * from public.create_preorder(
    'Cliente Dois', 'retirada', null, 'pix',
    (select itens from itens_pedido),
    'DUDA10'
  );

select is(
  (select uses_reserved from public.coupons where code = 'DUDA10'),
  2,
  'segundo pedido reserva mais um uso'
);

update public.orders
   set status = 'cancelado'
 where id = (select order_id from pedido_cancelado);

select is(
  (select uses_reserved from public.coupons where code = 'DUDA10'),
  1,
  'cancelar antes de pagar devolve a vaga do cupom'
);

select is(
  (select uses_confirmed from public.coupons where code = 'DUDA10'),
  1,
  'cancelamento não mexe no que já foi pago'
);

-- =============================================================
-- Histórico não se mexe
-- =============================================================

update public.coupons
   set active = false, discount_percent = 50
 where code = 'DUDA10';

select is(
  (select discount_cents from public.orders
    where id = (select order_id from pedido_minusculo)),
  2000,
  'desativar e editar o cupom não altera o desconto do pedido antigo'
);

select is(
  (select coupon_code_snapshot from public.orders
    where id = (select order_id from pedido_minusculo)),
  'DUDA10',
  'o pedido guarda o código usado, não só a referência'
);

-- Um cupom sem pedido pode ser apagado de verdade; o pedido de quem já
-- usou continua inteiro pelo snapshot.
delete from public.coupons where code = 'FUTURO';

select is(
  (select count(*)::integer from public.orders
    where coupon_code_snapshot = 'DUDA10'),
  1,
  'pedido com cupom continua no histórico'
);

select * from finish();
rollback;
