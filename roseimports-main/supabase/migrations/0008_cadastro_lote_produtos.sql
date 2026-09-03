-- =============================================================
-- 0008 — cadastro em lote de produtos e estoque
--
-- Não cria dados comerciais. Variantes importadas sem preço ficam
-- inativas até a revisão manual do cadastro.
-- =============================================================

-- Variantes passam a representar também concentração e kits.
alter table public.product_variants
  add column if not exists concentration text,
  add column if not exists is_kit boolean not null default false;

alter table public.product_variants
  drop constraint if exists product_variants_concentration_check;

alter table public.product_variants
  add constraint product_variants_concentration_check
  check (concentration is null or concentration in ('EDP', 'EDT', 'Parfum'));

-- Preço ausente só é aceito em rascunho. Uma variante ativa continua
-- obrigatoriamente publicável e, portanto, com preço positivo.
alter table public.product_variants
  alter column price_cents drop not null;

alter table public.product_variants
  drop constraint if exists product_variants_price_cents_check;

alter table public.product_variants
  add constraint product_variants_price_cents_check
  check (price_cents is null or price_cents > 0),
  add constraint product_variants_active_requires_price_check
  check (not active or price_cents is not null);

-- Cada componente conhecido do kit ocupa uma linha. Quantidade e volume
-- aceitam nulo para preservar exatamente o que veio da lista, sem inferir.
create table public.product_variant_kit_items (
  id                 uuid primary key default gen_random_uuid(),
  kit_variant_id     uuid not null references public.product_variants(id) on delete cascade,
  component_type     text not null check (length(trim(component_type)) > 0),
  component_name     text,
  volume_ml          integer check (volume_ml is null or volume_ml > 0),
  component_quantity integer check (component_quantity is null or component_quantity > 0),
  sort_order         integer not null default 0 check (sort_order >= 0),
  created_at         timestamptz not null default now(),

  constraint product_variant_kit_items_position_unique
    unique (kit_variant_id, sort_order)
);

create index idx_product_variant_kit_items_variant
  on public.product_variant_kit_items (kit_variant_id, sort_order);

-- Uma linha de idempotência só é gravada depois de todo o lote terminar.
-- Como a função PostgreSQL é atômica, falhas anteriores removem também
-- produtos, variantes e incrementos de estoque feitos na chamada.
create table public.bulk_product_imports (
  id              uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (length(trim(idempotency_key)) > 0),
  payload_hash    text not null check (length(trim(payload_hash)) > 0),
  confirmed_by    uuid not null references public.profiles(id) on delete restrict,
  result          jsonb not null,
  confirmed_at    timestamptz not null default now()
);

create index idx_bulk_product_imports_confirmed_at
  on public.bulk_product_imports (confirmed_at desc);

alter table public.product_variant_kit_items enable row level security;
alter table public.bulk_product_imports enable row level security;

create policy kit_items_admin_all on public.product_variant_kit_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy bulk_product_imports_admin_all on public.bulk_product_imports
  for all using (public.is_admin()) with check (public.is_admin());

-- Impede componentes em uma variante que não esteja marcada como kit.
create or replace function public.validate_kit_item_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_kit boolean;
begin
  select is_kit
    into v_is_kit
    from public.product_variants
   where id = new.kit_variant_id;

  if v_is_kit is distinct from true then
    raise exception 'variant_is_not_a_kit';
  end if;

  return new;
end;
$$;

create trigger trg_validate_kit_item_parent
  before insert or update on public.product_variant_kit_items
  for each row execute function public.validate_kit_item_parent();

-- A função inteira roda dentro da transação da chamada RPC.
create or replace function public.confirm_bulk_product_import(
  p_idempotency_key text,
  p_payload_hash text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_existing_hash text;
  v_existing_result jsonb;
  v_item jsonb;
  v_component jsonb;
  v_action text;
  v_quantity integer;
  v_product_id uuid;
  v_variant_id uuid;
  v_sort_order integer;
  v_updated integer;
  v_is_kit boolean;
  v_result jsonb;
  v_products_created integer := 0;
  v_variants_created integer := 0;
  v_existing_variants_updated integer := 0;
  v_units_added integer := 0;
  v_component_order integer;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  if nullif(trim(p_idempotency_key), '') is null then
    raise exception 'invalid_idempotency_key';
  end if;

  if nullif(trim(p_payload_hash), '') is null then
    raise exception 'invalid_payload_hash';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_import';
  end if;

  -- Serializa duas confirmações concorrentes da mesma chave.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  select payload_hash, result
    into v_existing_hash, v_existing_result
    from public.bulk_product_imports
   where idempotency_key = p_idempotency_key;

  if found then
    if v_existing_hash <> p_payload_hash then
      raise exception 'idempotency_key_reused_with_different_payload';
    end if;

    return v_existing_result;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_action := v_item->>'action';
    v_quantity := nullif(v_item->>'quantity', '')::integer;

    if v_quantity is null or v_quantity < 1 or v_quantity > 9999 then
      raise exception 'invalid_import_quantity';
    end if;

    if v_action = 'increment_existing_variant' then
      v_variant_id := nullif(v_item->>'variantId', '')::uuid;

      update public.product_variants
         set stock_quantity = stock_quantity + v_quantity
       where id = v_variant_id
         and stock_quantity + v_quantity <= 9999;

      get diagnostics v_updated = row_count;

      if v_updated = 0 then
        if exists (select 1 from public.product_variants where id = v_variant_id) then
          raise exception 'stock_limit_exceeded';
        end if;
        raise exception 'variant_not_found';
      end if;

      v_existing_variants_updated := v_existing_variants_updated + 1;

    elsif v_action = 'create_inactive_variant' then
      v_product_id := nullif(v_item->>'productId', '')::uuid;

      -- Além de validar existência, o lock evita duas variantes novas com
      -- a mesma próxima posição dentro do mesmo produto.
      perform 1 from public.products where id = v_product_id for update;
      if not found then
        raise exception 'product_not_found';
      end if;

      select coalesce(max(sort_order), -1) + 1
        into v_sort_order
        from public.product_variants
       where product_id = v_product_id;

      v_is_kit := coalesce((v_item->>'isKit')::boolean, false);

      insert into public.product_variants (
        product_id,
        label,
        volume_ml,
        variant_type,
        price_cents,
        stock_quantity,
        active,
        sort_order,
        concentration,
        is_kit
      ) values (
        v_product_id,
        nullif(trim(v_item->>'variantLabel'), ''),
        nullif(v_item->>'volumeMl', '')::integer,
        coalesce(nullif(v_item->>'variantType', ''), 'full'),
        null,
        v_quantity,
        false,
        v_sort_order,
        nullif(v_item->>'concentration', ''),
        v_is_kit
      )
      returning id into v_variant_id;

      v_variants_created := v_variants_created + 1;

    elsif v_action = 'create_inactive_product' then
      insert into public.products (
        name,
        slug,
        brand,
        category_id,
        product_type,
        gender,
        olfactory_family_id,
        description,
        active,
        featured,
        promotional
      ) values (
        nullif(trim(v_item->>'name'), ''),
        nullif(trim(v_item->>'slug'), ''),
        nullif(trim(v_item->>'brand'), ''),
        nullif(v_item->>'categoryId', '')::uuid,
        nullif(v_item->>'productType', ''),
        null,
        null,
        null,
        false,
        false,
        false
      )
      returning id into v_product_id;

      v_is_kit := coalesce((v_item->>'isKit')::boolean, false);

      insert into public.product_variants (
        product_id,
        label,
        volume_ml,
        variant_type,
        price_cents,
        stock_quantity,
        active,
        sort_order,
        concentration,
        is_kit
      ) values (
        v_product_id,
        nullif(trim(v_item->>'variantLabel'), ''),
        nullif(v_item->>'volumeMl', '')::integer,
        coalesce(nullif(v_item->>'variantType', ''), 'full'),
        null,
        v_quantity,
        false,
        0,
        nullif(v_item->>'concentration', ''),
        v_is_kit
      )
      returning id into v_variant_id;

      v_products_created := v_products_created + 1;
      v_variants_created := v_variants_created + 1;

    else
      raise exception 'invalid_import_action';
    end if;

    if v_action in ('create_inactive_product', 'create_inactive_variant') then
      if nullif(trim(v_item->>'variantLabel'), '') is null then
        raise exception 'invalid_variant_label';
      end if;

      if v_is_kit and jsonb_typeof(coalesce(v_item->'components', '[]'::jsonb)) = 'array' then
        v_component_order := 0;

        for v_component in
          select value from jsonb_array_elements(coalesce(v_item->'components', '[]'::jsonb))
        loop
          insert into public.product_variant_kit_items (
            kit_variant_id,
            component_type,
            component_name,
            volume_ml,
            component_quantity,
            sort_order
          ) values (
            v_variant_id,
            nullif(trim(v_component->>'type'), ''),
            nullif(trim(v_component->>'name'), ''),
            nullif(v_component->>'volumeMl', '')::integer,
            nullif(v_component->>'quantity', '')::integer,
            v_component_order
          );

          v_component_order := v_component_order + 1;
        end loop;
      elsif jsonb_array_length(coalesce(v_item->'components', '[]'::jsonb)) > 0 then
        raise exception 'components_require_kit_variant';
      end if;
    end if;

    v_units_added := v_units_added + v_quantity;
  end loop;

  v_result := jsonb_build_object(
    'productsCreated', v_products_created,
    'variantsCreated', v_variants_created,
    'existingVariantsUpdated', v_existing_variants_updated,
    'unitsAdded', v_units_added
  );

  insert into public.bulk_product_imports (
    idempotency_key,
    payload_hash,
    confirmed_by,
    result
  ) values (
    p_idempotency_key,
    p_payload_hash,
    auth.uid(),
    v_result
  );

  return v_result;
end;
$$;

revoke all on function public.confirm_bulk_product_import(text, text, jsonb) from public;
grant execute on function public.confirm_bulk_product_import(text, text, jsonb) to authenticated;
