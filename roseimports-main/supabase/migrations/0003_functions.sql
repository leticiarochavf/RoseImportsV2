-- =============================================================
-- Rose Imports — 0003_functions
-- O coração da regra de negócio: estoque só cai no "Pago". (§23)
-- =============================================================

-- -------------------------------------------------------------
-- Guarda de transição de status.
--
-- Bloqueia:
--   • marcar 'pago' sem passar por mark_order_paid()
--   • sair de um pedido já pago para novo/em_atendimento/cancelado (§24)
--   • ressuscitar pedido cancelado
--   • limpar paid_at manualmente
-- -------------------------------------------------------------
create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'pago' and new.paid_at is null then
    raise exception 'use_mark_order_paid'
      using hint = 'Marque como pago pela função mark_order_paid(), que baixa o estoque.';
  end if;

  if old.paid_at is not null and new.paid_at is null then
    raise exception 'cannot_unpay';
  end if;

  if old.paid_at is not null
     and new.status in ('novo','em_atendimento','cancelado') then
    raise exception 'order_already_paid'
      using hint = 'Pedido pago só pode virar Entregue ou Retirado.';
  end if;

  if old.status = 'cancelado' and new.status <> 'cancelado' then
    raise exception 'order_cancelled_is_final';
  end if;

  return new;
end;
$$;

create trigger trg_orders_status_guard
  before update on public.orders
  for each row execute function public.enforce_order_status_transition();

-- -------------------------------------------------------------
-- mark_order_paid — transacional, idempotente, sem estoque negativo.
--
-- Retorna already_paid = true quando o pedido já estava pago:
-- chamar duas vezes não desconta duas vezes. (§23)
-- -------------------------------------------------------------
create or replace function public.mark_order_paid(p_order_id uuid)
returns table (order_number text, already_paid boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   public.orders%rowtype;
  v_item    record;
  v_updated integer;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  -- trava a linha do pedido: duas abas do admin não disputam
  select * into v_order from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.paid_at is not null then
    return query select v_order.order_number, true;
    return;
  end if;

  if v_order.status = 'cancelado' then
    raise exception 'order_cancelled';
  end if;

  -- ordenado por variant_id: evita deadlock entre dois pedidos
  -- que compartilham as mesmas variantes
  for v_item in
    select oi.variant_id,
           oi.quantity,
           oi.product_name_snapshot,
           oi.variant_label_snapshot
      from public.order_items oi
     where oi.order_id = p_order_id
     order by oi.variant_id
  loop
    if v_item.variant_id is null then
      raise exception 'variant_removed:%', v_item.product_name_snapshot;
    end if;

    -- a condição no WHERE é o que impede estoque negativo
    update public.product_variants
       set stock_quantity = stock_quantity - v_item.quantity
     where id = v_item.variant_id
       and stock_quantity >= v_item.quantity;

    get diagnostics v_updated = row_count;

    if v_updated = 0 then
      raise exception 'insufficient_stock:% (%)',
        v_item.product_name_snapshot, v_item.variant_label_snapshot;
    end if;
  end loop;

  update public.orders
     set status = 'pago', paid_at = now()
   where id = p_order_id;

  return query select v_order.order_number, false;
end;
$$;

revoke all on function public.mark_order_paid(uuid) from public, anon;
grant execute on function public.mark_order_paid(uuid) to authenticated;
