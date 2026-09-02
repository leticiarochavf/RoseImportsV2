-- =============================================================
-- 0009 — consistência entre categoria e tipo de produto
--
-- O parser traduz os cabeçalhos comerciais somente para as duas
-- categorias ativas do catálogo. Esta garantia no banco impede que a
-- RPC ou outro cadastro grave uma combinação divergente por engano.
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
    when new.product_type = 'perfume' then 'perfumes'
    when new.product_type in ('body_splash', 'cosmetico') then 'cosmeticos'
    else null
  end;

  if v_expected_slug is null or v_category_slug <> v_expected_slug then
    raise exception 'product_category_type_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_product_category_type on public.products;
create trigger trg_validate_product_category_type
  before insert or update of category_id, product_type on public.products
  for each row execute function public.validate_product_category_type();
