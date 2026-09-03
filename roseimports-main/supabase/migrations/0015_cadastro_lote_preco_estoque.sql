-- =============================================================
-- 0015 — cadastro em lote com preço e estoque prontos
--
-- Reaproveita a RPC transacional existente. O produto continua inativo
-- até receber uma imagem pelo fluxo manual; somente a variante recebe preço
-- real e pode ficar disponível para venda.
-- =============================================================

alter function public.confirm_bulk_product_import(text, text, jsonb)
  rename to confirm_bulk_product_import_base;

create or replace function public.confirm_bulk_product_import(
  p_idempotency_key text,
  p_payload_hash text,
  p_items jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_base_items jsonb;
  v_item jsonb;
  v_result jsonb;
  v_product_id uuid;
  v_price_cents integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'invalid_import_items';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if v_item->>'action' = 'create_product_with_sale_data' then
      v_price_cents := nullif(v_item->>'priceCents', '')::integer;

      if v_price_cents is null or v_price_cents <= 0 or v_price_cents > 10000000 then
        raise exception 'invalid_import_price';
      end if;

      if coalesce((v_item->>'availableForSale')::boolean, false) is distinct from true then
        raise exception 'sale_data_requires_available_variant';
      end if;
    end if;
  end loop;

  select jsonb_agg(
    case
      when value->>'action' = 'create_product_with_sale_data'
        then jsonb_set(value, '{action}', '"create_inactive_product"'::jsonb)
      else value
    end
    order by ordinality
  )
    into v_base_items
    from jsonb_array_elements(p_items) with ordinality;

  v_result := public.confirm_bulk_product_import_base(
    p_idempotency_key,
    p_payload_hash,
    v_base_items
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if v_item->>'action' in ('create_inactive_product', 'create_product_with_sale_data') then
      update public.products
         set olfactory_family_id = nullif(v_item->>'olfactoryFamilyId', '')::uuid,
             description = nullif(trim(v_item->>'description'), ''),
             featured = coalesce((v_item->>'featured')::boolean, false),
             promotional = coalesce((v_item->>'promotional')::boolean, false),
             active = false
       where slug = nullif(trim(v_item->>'slug'), '')
       returning id into v_product_id;

      if not found then
        raise exception 'imported_product_not_found';
      end if;

      if v_item->>'action' = 'create_product_with_sale_data' then
        v_price_cents := (v_item->>'priceCents')::integer;

        update public.product_variants
           set price_cents = v_price_cents,
               active = true
         where product_id = v_product_id;

        if not found then
          raise exception 'imported_variant_not_found';
        end if;
      end if;
    end if;
  end loop;

  return v_result;
end;
$$;

revoke all on function public.confirm_bulk_product_import_base(text, text, jsonb) from public;
grant execute on function public.confirm_bulk_product_import_base(text, text, jsonb) to authenticated;
revoke all on function public.confirm_bulk_product_import(text, text, jsonb) from public;
grant execute on function public.confirm_bulk_product_import(text, text, jsonb) to authenticated;
