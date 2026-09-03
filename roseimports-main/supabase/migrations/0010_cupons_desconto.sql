-- =============================================================
-- 0010 — cupons de desconto com atribuição a influenciadores
--
-- Fase 1: estrutura e CRUD do painel. O resgate no checkout e o
-- incremento transacional do contador entram na 0011, junto com a
-- alteração do fluxo de criação de pedido.
--
-- Duas contagens de uso, de propósito:
--   uses_reserved  → sobe quando o pré-pedido é criado. É contra ele
--                    que o limite é conferido, então dois clientes
--                    simultâneos nunca passam do máximo juntos.
--   uses_confirmed → sobe quando o admin marca o pedido como pago.
--                    É a venda de verdade, a que vale no relatório.
-- Pedido cancelado antes do pagamento devolve a reserva.
-- =============================================================

-- -------------------------------------------------------------
-- influencers — a pessoa vive mais que o cupom.
-- Um influenciador acumula vários cupons ao longo do tempo e o
-- desempenho dele é a soma de todos.
-- -------------------------------------------------------------
create table public.influencers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  handle     text check (handle is null or length(trim(handle)) > 0),
  notes      text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_influencers_touch
  before update on public.influencers
  for each row execute function public.touch_updated_at();

create index idx_influencers_name on public.influencers (name);

-- -------------------------------------------------------------
-- coupons
--
-- O código é gravado já normalizado (maiúsculas, sem espaço nas
-- pontas). O CHECK abaixo é a garantia de que continua assim mesmo
-- se alguém escrever direto no banco — "duda10" e "DUDA10" precisam
-- ser sempre a mesma linha.
--
-- Nulos com significado:
--   starts_at  null → vale desde já
--   expires_at null → sem prazo
--   max_uses   null → usos ilimitados
-- -------------------------------------------------------------
create table public.coupons (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,
  discount_percent smallint not null check (discount_percent between 1 and 100),
  influencer_id    uuid references public.influencers(id) on delete restrict,
  starts_at        timestamptz,
  expires_at       timestamptz,
  max_uses         integer check (max_uses is null or max_uses > 0),
  uses_reserved    integer not null default 0 check (uses_reserved >= 0),
  uses_confirmed   integer not null default 0 check (uses_confirmed >= 0),
  show_in_showcase boolean not null default false,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint chk_coupon_code_normalized
    check (code = upper(btrim(code)) and code ~ '^[A-Z0-9][A-Z0-9-]{2,23}$'),

  constraint chk_coupon_period
    check (expires_at is null or starts_at is null or expires_at > starts_at),

  -- Um uso confirmado sempre passou antes por uma reserva.
  constraint chk_coupon_confirmed_le_reserved
    check (uses_confirmed <= uses_reserved),

  -- O limite vale para o banco, não só para a aplicação.
  constraint chk_coupon_reserved_le_max
    check (max_uses is null or uses_reserved <= max_uses)
);

create trigger trg_coupons_touch
  before update on public.coupons
  for each row execute function public.touch_updated_at();

-- Único inclusive entre cupons desativados: reaproveitar um código já
-- usado tornaria o histórico de vendas ambíguo.
create unique index uq_coupons_code on public.coupons (code);

create index idx_coupons_influencer on public.coupons (influencer_id);
create index idx_coupons_showcase   on public.coupons (show_in_showcase) where active;

-- -------------------------------------------------------------
-- orders — snapshot do desconto aplicado.
--
-- coupon_id é só o vínculo para relatório e vira null se o cupom for
-- apagado. O que preserva o histórico são os três campos de snapshot:
-- desativar, editar ou excluir um cupom nunca muda o valor de um
-- pedido já feito. (mesma ideia dos snapshots em order_items, §42)
--
-- subtotal_cents continua sendo o valor BRUTO, como sempre foi. O que
-- o cliente paga é total_cents.
-- -------------------------------------------------------------
alter table public.orders
  add column coupon_id                        uuid references public.coupons(id) on delete set null,
  add column coupon_code_snapshot             text,
  add column coupon_discount_percent_snapshot smallint,
  add column discount_cents                   integer not null default 0 check (discount_cents >= 0),
  add column total_cents                      integer
    generated always as (subtotal_cents - discount_cents) stored;

alter table public.orders
  add constraint chk_order_discount_not_above_subtotal
    check (discount_cents <= subtotal_cents),

  -- Ou o pedido tem os três dados do cupom, ou não tem nenhum.
  add constraint chk_order_coupon_snapshot_complete
    check (
      (coupon_code_snapshot is null
        and coupon_discount_percent_snapshot is null
        and discount_cents = 0)
      or
      (coupon_code_snapshot is not null
        and coupon_discount_percent_snapshot between 1 and 100)
    );

create index idx_orders_coupon on public.orders (coupon_id) where coupon_id is not null;

-- -------------------------------------------------------------
-- RLS — cupom e influenciador são dados de gestão.
-- Nenhuma leitura pública por enquanto: a vitrine pública dos cupons
-- marcados fica para uma etapa posterior, com policy própria.
-- -------------------------------------------------------------
alter table public.influencers enable row level security;
alter table public.coupons     enable row level security;

create policy influencers_admin_all on public.influencers
  for all using (public.is_admin()) with check (public.is_admin());

create policy coupons_admin_all on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());
