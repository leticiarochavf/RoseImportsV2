begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

-- Administrador exclusivamente local para exercer auth.uid(), is_admin()
-- e as mesmas policies usadas pela aplicação.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '80000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'bulk-import-local@rose.invalid',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.profiles (id, full_name)
values ('80000000-0000-4000-8000-000000000001', 'Teste local de lote');

-- Produto existente usado para verificar incremento e variante nova.
insert into public.products (
  id,
  name,
  slug,
  brand,
  category_id,
  product_type,
  active
) values (
  '81000000-0000-4000-8000-000000000001',
  'Lattafa Jasoor',
  'lattafa-jasoor-rpc-test',
  'Lattafa',
  (select id from public.categories where slug = 'perfumes'),
  'perfume',
  true
);

insert into public.product_variants (
  id,
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
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  '100 ml',
  100,
  'full',
  10000,
  5,
  true,
  0,
  null,
  false
);

select set_config(
  'request.jwt.claim.sub',
  '80000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local search_path = public, extensions;

select has_function(
  'public',
  'confirm_bulk_product_import',
  array['text', 'text', 'jsonb'],
  'RPC de confirmação existe'
);

-- A primeira chamada mistura incremento, produto novo, variante nova em
-- produto existente e kit com componentes.
select is(
  public.confirm_bulk_product_import(
      '83000000-0000-4000-8000-000000000001',
      'sha256:original',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'increment_existing_variant',
          'quantity', 2,
          'variantId', '82000000-0000-4000-8000-000000000001',
          'name', 'Lattafa Jasoor',
          'brand', 'Lattafa',
          'categoryId', (select id from public.categories where slug = 'perfumes'),
          'productType', 'perfume',
          'gender', 'masculino'
        ),
        jsonb_build_object(
          'action', 'create_inactive_product',
          'quantity', 3,
          'name', 'Produto RPC Novo',
          'slug', 'produto-rpc-novo',
          'brand', 'Marca Teste',
          'categoryId', (select id from public.categories where slug = 'perfumes'),
          'productType', 'perfume',
          'gender', 'unissex',
          'variantLabel', '100 ml',
          'concentration', 'EDP',
          'volumeMl', 100,
          'variantType', 'full',
          'isKit', false,
          'components', '[]'::jsonb
        ),
        jsonb_build_object(
          'action', 'create_inactive_variant',
          'quantity', 4,
          'productId', '81000000-0000-4000-8000-000000000001',
          'name', 'Lattafa Jasoor',
          'brand', 'Lattafa',
          'categoryId', (select id from public.categories where slug = 'perfumes'),
          'productType', 'perfume',
          'gender', 'masculino',
          'variantLabel', '90 ml',
          'concentration', 'EDP',
          'volumeMl', 90,
          'variantType', 'full',
          'isKit', false,
          'components', '[]'::jsonb
        ),
        jsonb_build_object(
          'action', 'create_inactive_product',
          'quantity', 1,
          'name', 'Kit RPC',
          'slug', 'kit-rpc',
          'brand', 'Marca Teste',
          'categoryId', (select id from public.categories where slug = 'perfumes'),
          'productType', 'perfume',
          'gender', 'unissex',
          'variantLabel', 'Kit',
          'concentration', null,
          'volumeMl', null,
          'variantType', 'full',
          'isKit', true,
          'components', jsonb_build_array(
            jsonb_build_object(
              'type', 'perfume',
              'name', null,
              'volumeMl', 100,
              'quantity', 1
            ),
            jsonb_build_object(
              'type', 'loção corporal',
              'name', 'Savage',
              'volumeMl', 200,
              'quantity', 1
            )
          )
        )
      )
  )->>'productsCreated',
    '2',
    'primeira confirmação cria dois produtos'
  );

select is(
  (
    select (result->>'unitsAdded')::integer
    from public.bulk_product_imports
    where idempotency_key = '83000000-0000-4000-8000-000000000001'
  ),
  10,
  'resumo soma as dez unidades'
);

select is(
  (select stock_quantity from public.product_variants where id = '82000000-0000-4000-8000-000000000001'),
  7,
  'estoque existente é incrementado atomicamente'
);

select is(
  (select active from public.products where slug = 'produto-rpc-novo'),
  false,
  'produto importado nasce inativo'
);

select ok(
  (
    select not active and price_cents is null and stock_quantity = 3
    from public.product_variants
    where product_id = (select id from public.products where slug = 'produto-rpc-novo')
  ),
  'variante de produto novo nasce inativa, sem preço e com estoque'
);

select is(
  (select gender from public.products where slug = 'produto-rpc-novo'),
  'unissex',
  'gênero declarado é persistido no produto novo'
);

select is(
  (
    select count(*)::integer
    from public.product_images
    where product_id = (select id from public.products where slug = 'produto-rpc-novo')
  ),
  0,
  'cadastro em lote não cria imagem'
);

select ok(
  (
    select not active and price_cents is null and stock_quantity = 4
    from public.product_variants
    where product_id = '81000000-0000-4000-8000-000000000001'
      and volume_ml = 90
  ),
  'variante nova de produto existente segue a mesma regra de rascunho'
);

select is(
  (
    select count(*)::integer
    from public.product_variant_kit_items
    where kit_variant_id = (
      select id from public.product_variants
      where product_id = (select id from public.products where slug = 'kit-rpc')
    )
  ),
  2,
  'componentes do kit são persistidos'
);

select is(
  (
    select count(*)::integer from public.bulk_product_imports
    where idempotency_key = '83000000-0000-4000-8000-000000000001'
  ),
  1,
  'primeira confirmação grava uma auditoria'
);

select is(
  public.confirm_bulk_product_import(
    '83000000-0000-4000-8000-000000000001',
    'sha256:original',
    '[{"action":"increment_existing_variant","quantity":9999,"variantId":"82000000-0000-4000-8000-000000000001"}]'::jsonb
  ),
  (
    select result from public.bulk_product_imports
    where idempotency_key = '83000000-0000-4000-8000-000000000001'
  ),
  'repetição com mesma chave e hash devolve o resultado salvo'
);

select is(
  (select stock_quantity from public.product_variants where id = '82000000-0000-4000-8000-000000000001'),
  7,
  'repetição idempotente não incrementa novamente'
);

select is(
  (
    select count(*)::integer from public.bulk_product_imports
    where idempotency_key = '83000000-0000-4000-8000-000000000001'
  ),
  1,
  'repetição idempotente não duplica auditoria'
);

select throws_ok(
  $$
    select public.confirm_bulk_product_import(
      '83000000-0000-4000-8000-000000000001',
      'sha256:different',
      '[{"action":"increment_existing_variant","quantity":1,"variantId":"82000000-0000-4000-8000-000000000001"}]'::jsonb
    )
  $$,
  'P0001',
  'idempotency_key_reused_with_different_payload',
  'mesma chave com hash diferente é rejeitada'
);

-- O primeiro item altera estoque; o segundo viola o slug único. pgTAP
-- captura a exceção em subtransação e permite conferir o rollback total.
select throws_ok(
  $$
    select public.confirm_bulk_product_import(
      '84000000-0000-4000-8000-000000000001',
      'sha256:forced-failure',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'increment_existing_variant',
          'quantity', 3,
          'variantId', '82000000-0000-4000-8000-000000000001',
          'name', 'Lattafa Jasoor',
          'brand', 'Lattafa',
          'categoryId', (select id from public.categories where slug = 'perfumes'),
          'productType', 'perfume',
          'gender', 'masculino'
        ),
        jsonb_build_object(
          'action', 'create_inactive_product',
          'quantity', 1,
          'name', 'Este produto deve sumir no rollback',
          'slug', 'produto-rpc-novo',
          'brand', 'Marca Teste',
          'categoryId', (select id from public.categories where slug = 'perfumes'),
          'productType', 'perfume',
          'gender', 'unissex',
          'variantLabel', '100 ml',
          'concentration', null,
          'volumeMl', 100,
          'variantType', 'full',
          'isKit', false,
          'components', '[]'::jsonb
        )
      )
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "products_slug_key"',
  'falha induzida no meio da RPC é propagada'
);

select is(
  (select stock_quantity from public.product_variants where id = '82000000-0000-4000-8000-000000000001'),
  7,
  'incremento anterior à falha é revertido'
);

select is(
  (
    select count(*)::integer from public.products
    where name = 'Este produto deve sumir no rollback'
  ),
  0,
  'produto da chamada com falha não permanece'
);

select is(
  (
    select count(*)::integer from public.bulk_product_imports
    where idempotency_key = '84000000-0000-4000-8000-000000000001'
  ),
  0,
  'chamada com falha não grava auditoria de idempotência'
);

select throws_ok(
  $$
    select public.confirm_bulk_product_import(
      '85000000-0000-4000-8000-000000000001',
      'sha256:wrong-category',
      jsonb_build_array(
        jsonb_build_object(
          'action', 'create_inactive_product',
          'quantity', 1,
          'name', 'Perfume com categoria divergente',
          'slug', 'perfume-categoria-divergente',
          'brand', 'Marca Teste',
          'categoryId', (select id from public.categories where slug = 'cosmeticos'),
          'productType', 'perfume',
          'gender', 'unissex',
          'variantLabel', '100 ml',
          'concentration', null,
          'volumeMl', 100,
          'variantType', 'full',
          'isKit', false,
          'components', '[]'::jsonb
        )
      )
    )
  $$,
  'P0001',
  'product_category_type_mismatch',
  'RPC rejeita categoria incompatível com o tipo de produto'
);

select is(
  (
    select count(*)::integer from public.bulk_product_imports
    where idempotency_key = '85000000-0000-4000-8000-000000000001'
  ),
  0,
  'categoria incompatível não grava auditoria parcial'
);

select lives_ok(
  $$
    insert into public.products (
      name, slug, brand, category_id, product_type, gender, active
    ) values (
      'BODY SPLASH DE TESTE',
      'body-splash-categoria-perfume',
      'Marca Teste',
      (select id from public.categories where slug = 'perfumes'),
      'body_splash',
      'unissex',
      false
    )
  $$,
  'body splash pertence à categoria perfumes'
);

select throws_ok(
  $$
    insert into public.products (
      name, slug, brand, category_id, product_type, gender, active
    ) values (
      'BODY CREAM EM CATEGORIA INCORRETA',
      'body-cream-categoria-incorreta',
      'Marca Teste',
      (select id from public.categories where slug = 'perfumes'),
      'cosmetico',
      'unissex',
      false
    )
  $$,
  'P0001',
  'product_category_type_mismatch',
  'body cream não pode usar a categoria perfumes'
);

select lives_ok(
  $$
    select public.confirm_bulk_product_import(
      '87000000-0000-4000-8000-000000000001',
      'sha256:sale-data',
      jsonb_build_array(jsonb_build_object(
        'action', 'create_product_with_sale_data',
        'quantity', 3,
        'name', 'PRODUTO PRONTO PARA FOTO',
        'slug', 'produto-pronto-para-foto',
        'brand', 'Marca Teste',
        'categoryId', (select id from public.categories where slug = 'perfumes'),
        'productType', 'perfume',
        'gender', 'unissex',
        'olfactoryFamilyId', null,
        'description', 'Descrição informada',
        'featured', true,
        'promotional', false,
        'variantLabel', '100 ml',
        'concentration', null,
        'volumeMl', 100,
        'variantType', 'full',
        'isKit', false,
        'components', '[]'::jsonb,
        'priceCents', 24990,
        'availableForSale', true
      ))
    )
  $$,
  'RPC aceita produto com preço e estoque aguardando foto'
);

select is(
  (
    select jsonb_build_object(
      'productActive', p.active,
      'variantActive', v.active,
      'priceCents', v.price_cents,
      'stock', v.stock_quantity
    )
      from public.products p
      join public.product_variants v on v.product_id = p.id
     where p.slug = 'produto-pronto-para-foto'
  ),
  jsonb_build_object(
    'productActive', false,
    'variantActive', true,
    'priceCents', 24990,
    'stock', 3
  ),
  'produto fica oculto e variante fica pronta para venda após a foto'
);

select throws_ok(
  $$
    select public.confirm_bulk_product_import(
      '86000000-0000-4000-8000-000000000001',
      'sha256:missing-name',
      jsonb_build_array(jsonb_build_object(
        'action', 'increment_existing_variant', 'quantity', 1,
        'variantId', '82000000-0000-4000-8000-000000000001',
        'brand', 'Lattafa', 'categoryId', (select id from public.categories where slug = 'perfumes'),
        'productType', 'perfume', 'gender', 'masculino'
      ))
    )
  $$,
  'P0001',
  'invalid_import_name',
  'RPC rejeita item sem nome'
);

select throws_ok(
  $$
    select public.confirm_bulk_product_import(
      '86000000-0000-4000-8000-000000000002',
      'sha256:missing-brand',
      jsonb_build_array(jsonb_build_object(
        'action', 'increment_existing_variant', 'quantity', 1,
        'variantId', '82000000-0000-4000-8000-000000000001',
        'name', 'Lattafa Jasoor', 'categoryId', (select id from public.categories where slug = 'perfumes'),
        'productType', 'perfume', 'gender', 'masculino'
      ))
    )
  $$,
  'P0001',
  'invalid_import_brand',
  'RPC rejeita item sem marca'
);

select throws_ok(
  $$
    select public.confirm_bulk_product_import(
      '86000000-0000-4000-8000-000000000003',
      'sha256:missing-category',
      jsonb_build_array(jsonb_build_object(
        'action', 'increment_existing_variant', 'quantity', 1,
        'variantId', '82000000-0000-4000-8000-000000000001',
        'name', 'Lattafa Jasoor', 'brand', 'Lattafa',
        'productType', 'perfume', 'gender', 'masculino'
      ))
    )
  $$,
  'P0001',
  'invalid_import_category',
  'RPC rejeita item sem categoria'
);

select throws_ok(
  $$
    select public.confirm_bulk_product_import(
      '86000000-0000-4000-8000-000000000004',
      'sha256:missing-type',
      jsonb_build_array(jsonb_build_object(
        'action', 'increment_existing_variant', 'quantity', 1,
        'variantId', '82000000-0000-4000-8000-000000000001',
        'name', 'Lattafa Jasoor', 'brand', 'Lattafa',
        'categoryId', (select id from public.categories where slug = 'perfumes'),
        'gender', 'masculino'
      ))
    )
  $$,
  'P0001',
  'invalid_import_product_type',
  'RPC rejeita item sem tipo de produto'
);

select throws_ok(
  $$
    select public.confirm_bulk_product_import(
      '86000000-0000-4000-8000-000000000005',
      'sha256:missing-gender',
      jsonb_build_array(jsonb_build_object(
        'action', 'increment_existing_variant', 'quantity', 1,
        'variantId', '82000000-0000-4000-8000-000000000001',
        'name', 'Lattafa Jasoor', 'brand', 'Lattafa',
        'categoryId', (select id from public.categories where slug = 'perfumes'),
        'productType', 'perfume'
      ))
    )
  $$,
  'P0001',
  'invalid_import_gender',
  'RPC rejeita item sem gênero'
);

select * from finish();
rollback;
