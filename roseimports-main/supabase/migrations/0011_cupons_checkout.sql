-- =============================================================
-- 0011 — resgate de cupom no checkout
--
-- O pedido inteiro passa a nascer dentro de uma função: itens, cupom e
-- reserva do uso numa transação só. Ou tudo acontece, ou nada acontece.
--
-- O desconto NUNCA vem do navegador. A função recebe o código digitado,
-- em texto, e calcula o valor a partir da porcentagem guardada na linha
-- do cupom. (mesma regra do preço em /api/pedidos, §18)
-- =============================================================

-- -------------------------------------------------------------
-- Pedido cancelado antes do pagamento devolve a vaga do cupom.
--
-- 'cancelado' é estado final pelo guard da 0003, então isto roda no
-- máximo uma vez por pedido — nunca devolve duas vezes a mesma vaga.
-- Pedido pago não pode ser cancelado, então uses_confirmed nunca
-- precisa voltar atrás.
-- -------------------------------------------------------------
create or replace function public.release_coupon_reservation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'cancelado'
     and old.status is distinct from 'cancelado'
     and new.coupon_id is not null
     and new.paid_at is null then

    update public.coupons
       set uses_reserved = uses_reserved - 1
     where id = new.coupon_id
       and uses_reserved > 0;
  end if;

  return new;
end;
$$;

create trigger trg_orders_release_coupon
  after update on public.orders
  for each row execute function public.release_coupon_reservation();

-- -------------------------------------------------------------
-- create_preorder — cria o pré-pedido e reclama o cupom.
--
-- Recebe os itens já conferidos pela API (preço e estoque lidos do
-- banco lá) e RECALCULA o subtotal aqui: nenhum total chega pronto de
-- fora. O cupom entra só como texto.
--
-- Erros possíveis, todos antes de qualquer escrita valer:
--   coupon_not_found / coupon_inactive / coupon_not_started
--   coupon_expired   / coupon_exhausted
-- -------------------------------------------------------------
create or replace function public.create_preorder(
  p_customer_name    text,
  p_fulfillment_type text,
  p_neighborhood     text,
  p_payment_method   text,
  p_items            jsonb,
  p_coupon_code      text default null
)
returns table (
  order_id                uuid,
  order_number            text,
  subtotal_cents          integer,
  discount_cents          integer,
  total_cents             integer,
  coupon_code             text,
  coupon_discount_percent smallint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code      text;
  v_coupon    public.coupons%rowtype;
  v_updated   integer;
  v_subtotal  integer := 0;
  v_discount  integer := 0;
  v_percent   smallint;
  v_coupon_id uuid;
  v_order     public.orders%rowtype;
begin
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
  end if;

  -- Subtotal recalculado a partir de preço e quantidade de cada linha.
  select coalesce(sum((item->>'unitPriceCents')::integer
                    * (item->>'quantity')::integer), 0)
    into v_subtotal
    from jsonb_array_elements(p_items) as item;

  if v_subtotal <= 0 then
    raise exception 'empty_order';
  end if;

  -- Normalização: "  duda10 " e "DUDA10" procuram a mesma linha.
  v_code := nullif(upper(btrim(coalesce(p_coupon_code, ''))), '');

  if v_code is not null then
    /*
      Reserva o uso num UPDATE condicional único. É a linha do cupom que
      serializa dois clientes simultâneos: o segundo só chega aqui depois
      que o primeiro comitou, e aí lê uses_reserved já incrementado. Sem
      SELECT antes decidindo nada — é o mesmo desenho do estoque em
      mark_order_paid(). (§23)
    */
    update public.coupons
       set uses_reserved = uses_reserved + 1
     where code = v_code
       and active
       and (starts_at  is null or starts_at  <= now())
       and (expires_at is null or expires_at >  now())
       and (max_uses   is null or uses_reserved < max_uses)
    returning * into v_coupon;

    get diagnostics v_updated = row_count;

    if v_updated = 0 then
      -- Nada foi escrito. Esta leitura serve só para explicar o motivo.
      select * into v_coupon from public.coupons where code = v_code;

      if not found then
        raise exception 'coupon_not_found';
      elsif not v_coupon.active then
        raise exception 'coupon_inactive';
      elsif v_coupon.starts_at is not null and v_coupon.starts_at > now() then
        raise exception 'coupon_not_started';
      elsif v_coupon.expires_at is not null and v_coupon.expires_at <= now() then
        raise exception 'coupon_expired';
      else
        raise exception 'coupon_exhausted';
      end if;
    end if;

    v_coupon_id := v_coupon.id;
    v_percent   := v_coupon.discount_percent;

    -- round() do Postgres arredonda meio para cima, igual à prévia da tela.
    v_discount := least(
      round(v_subtotal::numeric * v_percent / 100)::integer,
      v_subtotal
    );
  end if;

  insert into public.orders (
    customer_name,
    fulfillment_type,
    neighborhood,
    payment_method,
    subtotal_cents,
    status,
    coupon_id,
    coupon_code_snapshot,
    coupon_discount_percent_snapshot,
    discount_cents
  )
  values (
    p_customer_name,
    p_fulfillment_type,
    p_neighborhood,
    p_payment_method,
    v_subtotal,
    'novo',
    v_coupon_id,
    -- O snapshot é o que preserva o histórico: mexer no cupom depois
    -- não muda mais nada deste pedido.
    case when v_coupon_id is null then null else v_coupon.code end,
    v_percent,
    v_discount
  )
  returning * into v_order;

  insert into public.order_items (
    order_id,
    product_id,
    variant_id,
    product_name_snapshot,
    variant_label_snapshot,
    unit_price_cents_snapshot,
    quantity,
    subtotal_cents
  )
  select
    v_order.id,
    nullif(item->>'productId', '')::uuid,
    nullif(item->>'variantId', '')::uuid,
    item->>'productName',
    item->>'variantLabel',
    (item->>'unitPriceCents')::integer,
    (item->>'quantity')::integer,
    (item->>'unitPriceCents')::integer * (item->>'quantity')::integer
  from jsonb_array_elements(p_items) as item;

  return query
    select
      v_order.id,
      v_order.order_number,
      v_order.subtotal_cents,
      v_order.discount_cents,
      v_order.total_cents,
      v_order.coupon_code_snapshot,
      v_order.coupon_discount_percent_snapshot;
end;
$$;

-- Só o servidor da loja cria pedido. Nenhum caminho público de escrita.
revoke all on function public.create_preorder(text, text, text, text, jsonb, text)
  from public, anon, authenticated;

grant execute on function public.create_preorder(text, text, text, text, jsonb, text)
  to service_role;

-- -------------------------------------------------------------
-- mark_order_paid — agora também confirma o uso do cupom.
--
-- Reescrita inteira porque a função é `create or replace`: o corpo
-- abaixo é o da 0003 com o bloco do cupom no fim. Continua idempotente,
-- então marcar como pago duas vezes não conta duas vendas.
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

  /*
    A reserva do cupom virou venda. O relatório usa uses_confirmed, então
    ele só sobe aqui — pré-pedido que nunca foi pago não conta como venda.
    Cupom apagado depois deixa coupon_id nulo e o pedido segue intacto
    pelos snapshots.
  */
  if v_order.coupon_id is not null then
    update public.coupons
       set uses_confirmed = uses_confirmed + 1
     where id = v_order.coupon_id;
  end if;

  update public.orders
     set status = 'pago', paid_at = now()
   where id = p_order_id;

  return query select v_order.order_number, false;
end;
$$;

revoke all on function public.mark_order_paid(uuid) from public, anon;
grant execute on function public.mark_order_paid(uuid) to authenticated;
