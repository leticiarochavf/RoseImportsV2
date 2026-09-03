-- =============================================================
-- 0012 — campos obrigatórios da confirmação em lote
--
-- Valida os metadados declarados para todas as ações sem alterar preço,
-- publicação ou imagens. Produtos e variantes novos continuam inativos e
-- com preço nulo até revisão humana.
-- =============================================================

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

    if nullif(trim(v_item->>'name'), '') is null then
      raise exception 'invalid_import_name';
    end if;

    if nullif(trim(v_item->>'brand'), '') is null then
      raise exception 'invalid_import_brand';
    end if;

    if nullif(trim(v_item->>'categoryId'), '') is null then
      raise exception 'invalid_import_category';
    end if;

    if coalesce(v_item->>'productType', '') not in ('perfume', 'body_splash', 'cosmetico') then
      raise exception 'invalid_import_product_type';
    end if;

    if coalesce(v_item->>'gender', '') not in ('feminino', 'masculino', 'unissex') then
      raise exception 'invalid_import_gender';
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
        nullif(v_item->>'gender', ''),
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
