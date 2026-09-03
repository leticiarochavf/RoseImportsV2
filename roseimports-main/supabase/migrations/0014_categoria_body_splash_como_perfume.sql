-- =============================================================
-- 0014 — body splash na categoria de perfumes
--
-- A regra comercial reserva a categoria "cosmeticos" aos body creams
-- (product_type = cosmetico). Perfumes, kits e body splashes usam a
-- categoria "perfumes". A migration apenas atualiza a validação existente.
-- =============================================================

create or replace function public.validate_product_category_type()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_category_slug text;
  v_category_active boolean;
  v_expected_slug text;
begin
  select slug, active
    into v_category_slug, v_category_active
    from public.categories
   where id = new.category_id;

  if not found or v_category_active is distinct from true then
    raise exception 'invalid_product_category';
  end if;

  v_expected_slug := case
    when new.product_type in ('perfume', 'body_splash') then 'perfumes'
    when new.product_type = 'cosmetico' then 'cosmeticos'
    else null
  end;

  if v_expected_slug is null or v_category_slug <> v_expected_slug then
    raise exception 'product_category_type_mismatch';
  end if;

  return new;
end;
$$;
