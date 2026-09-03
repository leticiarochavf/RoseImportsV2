-- =============================================================
-- 0013 — desempenho por cupom e por influenciador
--
-- Receita segue a regra da casa: quem manda é paid_at, não status. (§23)
-- Pré-pedido que ainda está em atendimento no WhatsApp aparece à parte,
-- como pendente, e nunca somado ao faturamento.
--
-- Duas visões de dinheiro por cupom:
--   bruto  → soma de subtotal_cents, o valor antes do desconto
--   líquido→ soma de total_cents, o que a loja recebeu de fato
-- A diferença entre os dois é exatamente o desconto concedido.
--
-- security_invoker: as views herdam a RLS de coupons e orders, então
-- continuam visíveis só para administrador.
-- =============================================================

create view public.coupon_performance
with (security_invoker = on)
as
select
  c.id,
  c.code,
  c.discount_percent,
  c.influencer_id,
  c.active,
  c.show_in_showcase,
  c.starts_at,
  c.expires_at,
  c.max_uses,
  c.uses_reserved,
  c.uses_confirmed,
  c.created_at,

  count(o.id) filter (where o.paid_at is not null)::integer
    as paid_orders,

  -- Aguardando pagamento: pedido feito, ainda não pago, não cancelado.
  count(o.id) filter (where o.paid_at is null and o.status <> 'cancelado')::integer
    as pending_orders,

  count(o.id) filter (where o.status = 'cancelado')::integer
    as cancelled_orders,

  coalesce(sum(o.subtotal_cents) filter (where o.paid_at is not null), 0)::integer
    as paid_gross_cents,

  coalesce(sum(o.discount_cents) filter (where o.paid_at is not null), 0)::integer
    as paid_discount_cents,

  coalesce(sum(o.total_cents) filter (where o.paid_at is not null), 0)::integer
    as paid_net_cents,

  coalesce(
    sum(o.total_cents) filter (where o.paid_at is null and o.status <> 'cancelado'),
    0
  )::integer as pending_net_cents

from public.coupons c
left join public.orders o on o.coupon_id = c.id
group by c.id;

-- Um influenciador acumula vários cupons. Aqui a conta é a soma de todos.
create view public.influencer_performance
with (security_invoker = on)
as
select
  i.id,
  i.name,
  i.handle,
  i.active,

  count(p.id)::integer                                   as coupons_total,
  count(p.id) filter (where p.active)::integer            as coupons_active,

  coalesce(sum(p.paid_orders), 0)::integer               as paid_orders,
  coalesce(sum(p.pending_orders), 0)::integer            as pending_orders,
  coalesce(sum(p.paid_gross_cents), 0)::integer          as paid_gross_cents,
  coalesce(sum(p.paid_discount_cents), 0)::integer       as paid_discount_cents,
  coalesce(sum(p.paid_net_cents), 0)::integer            as paid_net_cents,
  coalesce(sum(p.pending_net_cents), 0)::integer         as pending_net_cents

from public.influencers i
left join public.coupon_performance p on p.influencer_id = i.id
group by i.id;

revoke all on public.coupon_performance     from anon;
revoke all on public.influencer_performance from anon;

grant select on public.coupon_performance     to authenticated;
grant select on public.influencer_performance to authenticated;
