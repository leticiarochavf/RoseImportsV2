-- =============================================================
-- Rose Imports — 0001_schema
-- Estrutura base. Dinheiro sempre em centavos (integer).
-- =============================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- -------------------------------------------------------------
-- updated_at automático
-- -------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- profiles — todo perfil existente é administrador (MVP, §43)
-- -------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  created_at timestamptz not null default now()
);

-- security definer: ignora RLS de propósito, evita recursão nas policies
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- -------------------------------------------------------------
-- categories
-- -------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  active     boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_categories_touch
  before update on public.categories
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------
-- olfactory_families — taxonomia extensível por linha, não enum (§12)
-- -------------------------------------------------------------
create table public.olfactory_families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  active     boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_olfactory_families_touch
  before update on public.olfactory_families
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------
-- products
-- -------------------------------------------------------------
create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  brand               text,
  category_id         uuid not null references public.categories(id) on delete restrict,
  product_type        text not null
                      check (product_type in ('perfume','body_splash','cosmetico','eletronico','acessorio')),
  gender              text
                      check (gender is null or gender in ('feminino','masculino','unissex')),
  olfactory_family_id uuid references public.olfactory_families(id) on delete set null,
  description         text,
  active              boolean not null default true,
  featured            boolean not null default false,
  promotional         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();

create index idx_products_active      on public.products (active);
create index idx_products_category    on public.products (category_id);
create index idx_products_featured    on public.products (featured) where active;
create index idx_products_name_trgm   on public.products using gin (name gin_trgm_ops);
create index idx_products_brand_trgm  on public.products using gin (brand gin_trgm_ops);

-- -------------------------------------------------------------
-- product_variants — decant é variante, não produto separado
-- -------------------------------------------------------------
create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  label          text not null,
  volume_ml      integer check (volume_ml is null or volume_ml > 0),
  variant_type   text not null default 'full' check (variant_type in ('full','decant')),
  price_cents    integer not null check (price_cents > 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  active         boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_product_variants_touch
  before update on public.product_variants
  for each row execute function public.touch_updated_at();

create index idx_variants_product on public.product_variants (product_id);
create index idx_variants_active  on public.product_variants (product_id) where active;

-- -------------------------------------------------------------
-- product_images
-- -------------------------------------------------------------
create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text     text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index idx_images_product on public.product_images (product_id, sort_order);

-- -------------------------------------------------------------
-- orders
-- Fonte da verdade de faturamento: paid_at, não status.
-- -------------------------------------------------------------
create sequence public.order_number_seq start 1000;

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique
                   default ('RI-' || nextval('public.order_number_seq')::text),
  customer_name    text not null check (length(trim(customer_name)) > 1),
  fulfillment_type text not null check (fulfillment_type in ('retirada','entrega')),
  neighborhood     text,
  payment_method   text not null check (payment_method in ('pix','dinheiro','cartao')),
  subtotal_cents   integer not null check (subtotal_cents >= 0),
  status           text not null default 'novo'
                   check (status in ('novo','em_atendimento','pago','entregue','retirado','cancelado')),
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- entrega exige bairro; retirada não guarda bairro (§33, dado mínimo)
  constraint chk_neighborhood check (
    (fulfillment_type = 'entrega' and neighborhood is not null and length(trim(neighborhood)) > 0)
    or
    (fulfillment_type = 'retirada' and neighborhood is null)
  )
);

create trigger trg_orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();

create index idx_orders_created on public.orders (created_at desc);
create index idx_orders_paid    on public.orders (paid_at) where paid_at is not null;
create index idx_orders_status  on public.orders (status);

-- -------------------------------------------------------------
-- order_items — snapshot congela o pedido (§42)
-- FK vira null se a variante sumir; o snapshot preserva o histórico.
-- -------------------------------------------------------------
create table public.order_items (
  id                        uuid primary key default gen_random_uuid(),
  order_id                  uuid not null references public.orders(id) on delete cascade,
  product_id                uuid references public.products(id) on delete set null,
  variant_id                uuid references public.product_variants(id) on delete set null,
  product_name_snapshot     text not null,
  variant_label_snapshot    text not null,
  unit_price_cents_snapshot integer not null check (unit_price_cents_snapshot > 0),
  quantity                  integer not null check (quantity > 0),
  subtotal_cents            integer not null check (subtotal_cents > 0)
);

create index idx_order_items_order on public.order_items (order_id);
