-- =============================================================
-- Rose Imports — 0002_rls
--
-- Regra geral: o navegador só LÊ catálogo, e só o que está ativo.
-- Pedidos são invisíveis para anônimo: a criação passa pela API
-- server-side com service role. Não existe caminho de escrita
-- pública para nenhuma tabela. (§34, §70)
-- =============================================================

alter table public.profiles           enable row level security;
alter table public.categories         enable row level security;
alter table public.olfactory_families enable row level security;
alter table public.products           enable row level security;
alter table public.product_variants   enable row level security;
alter table public.product_images     enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;

-- -------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid());

-- -------------------------------------------------------------
-- categories
-- -------------------------------------------------------------
create policy categories_public_read on public.categories
  for select using (active);

create policy categories_admin_all on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- olfactory_families
-- -------------------------------------------------------------
create policy families_public_read on public.olfactory_families
  for select using (active);

create policy families_admin_all on public.olfactory_families
  for all using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- products
-- -------------------------------------------------------------
create policy products_public_read on public.products
  for select using (active);

create policy products_admin_all on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- product_variants — variante inativa ou de produto inativo não vaza
-- -------------------------------------------------------------
create policy variants_public_read on public.product_variants
  for select using (
    active and exists (
      select 1 from public.products p
      where p.id = product_id and p.active
    )
  );

create policy variants_admin_all on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- product_images
-- -------------------------------------------------------------
create policy images_public_read on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.active
    )
  );

create policy images_admin_all on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- orders / order_items — nenhuma policy para anon.
-- Sem policy = negado. Só admin autenticado enxerga.
-- -------------------------------------------------------------
create policy orders_admin_read on public.orders
  for select using (public.is_admin());

create policy orders_admin_update on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

create policy order_items_admin_read on public.order_items
  for select using (public.is_admin());

-- Nota: INSERT em orders/order_items não tem policy nenhuma.
-- Só a service role (que ignora RLS) grava, via /api/pedidos.
