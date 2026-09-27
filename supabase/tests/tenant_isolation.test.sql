begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(29);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'platform@example.test', 'test-password', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'joao@example.test', 'test-password', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'maria@example.test', 'test-password', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

update public.profiles set platform_role = 'platform_admin'
where id = '10000000-0000-0000-0000-000000000001';

insert into public.tenants (id, owner_id, name, slug, domain, whatsapp_number)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'João Tech', 'joao-tech', 'joaotech.example', '5511999999999'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Maria Tech', 'maria-tech', 'mariatech.example', '5511888888888'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Burger Test', 'burger-test', 'burger-test.example', '5511777777777'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Barber Test', 'barber-test', 'barber-test.example', '5511666666666');

insert into public.categories (id, tenant_id, name, slug, active)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Câmeras', 'cameras', true),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Acessórios', 'acessorios', true),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Pratos', 'pratos', true),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'Cortes', 'cortes', true);

insert into public.products (id, tenant_id, category_id, name, slug, description, price, card_price, active)
values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Sony A6400', 'sony-a6400', 'Câmera compacta', 4200.00, 4200.00, true),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Produto oculto', 'produto-oculto', '', 100.00, 100.00, false),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'iPhone 15', 'iphone-15', '128 GB', 3499.00, 3499.00, true);

select is((select tenant_type from public.tenants where slug = 'joao-tech'), 'retail', 'existing tenant rows default to Retail');
select is((select pricing_mode from public.products where slug = 'sony-a6400'), 'fixed', 'existing catalog entries default to fixed prices');

select ok(not has_table_privilege('anon', 'public.tenants', 'select'), 'anon cannot select tenant rows directly');
select ok(not has_table_privilege('anon', 'public.products', 'select'), 'anon cannot select product rows directly');
select ok(not (public.get_public_storefront_by_slug('joao-tech') ? 'owner_id'), 'public storefront RPC does not expose owner id');
select is(public.get_public_storefront_by_slug('joao-tech')->>'name', 'João Tech', 'slug resolves the matching active storefront');
select is(public.get_public_storefront_by_domain('mariatech.example')->>'id', '20000000-0000-0000-0000-000000000002', 'domain resolves only its tenant');
select is(public.get_public_storefront_by_slug('missing-store'), null::jsonb, 'unknown stores are not returned');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.tenants), 1::bigint, 'owner sees only their tenant');
select is((select count(*) from public.products), 2::bigint, 'owner sees active and inactive products in their tenant');
select is((select count(*) from public.products where id = '40000000-0000-0000-0000-000000000003'), 0::bigint, 'owner cannot read another tenant product');
select lives_ok(
  $$update public.products set name = 'Sony A6400 editado' where id = '40000000-0000-0000-0000-000000000001'$$,
  'owner can update their own product'
);
select is((select name from public.products where id = '40000000-0000-0000-0000-000000000001'), 'Sony A6400 editado', 'owner update persists on their product');
select lives_ok(
  $$update public.products set name = 'Acesso indevido' where id = '40000000-0000-0000-0000-000000000003'$$,
  'cross-tenant update statement is safely rejected by row-level security'
);
select is(public.get_public_storefront_by_slug('maria-tech')->'products'->0->>'name', 'iPhone 15', 'owner cannot modify another tenant product');
select throws_ok(
  $$insert into public.products (tenant_id, name, slug, description, price, card_price) values ('20000000-0000-0000-0000-000000000002', 'Produto externo', 'produto-externo', '', 10, 10)$$,
  '42501', null, 'owner cannot create a product for another tenant'
);
select throws_ok(
  $$update public.tenants set tenant_type = 'services' where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'tenant owners cannot change the platform-managed vertical'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select is((select count(*) from public.tenants), 4::bigint, 'platform admin can see all tenants');
select lives_ok(
  $$update public.tenants set tenant_type = 'food' where id = '20000000-0000-0000-0000-000000000003'$$,
  'platform administrator can change a tenant to Food'
);
select lives_ok(
  $$insert into public.products (tenant_id, category_id, name, slug, description, price, card_price) values ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'Marmita caseira', 'marmita-caseira', 'Feita no dia', 28, 28)$$,
  'Food tenant can create a menu item with one fixed price'
);
select is(public.get_public_storefront_by_slug('burger-test')->>'tenant_type', 'food', 'slug storefront returns the configured Food vertical');
select is(public.get_public_product_by_store_slug('burger-test', 'marmita-caseira')->'product'->>'pricing_mode', 'fixed', 'Food item detail returns its pricing mode');
select lives_ok(
  $$update public.tenants set tenant_type = 'services' where id = '20000000-0000-0000-0000-000000000004'$$,
  'platform administrator can change a tenant to Services'
);
select lives_ok(
  $$insert into public.products (tenant_id, category_id, name, slug, description, pricing_mode, price, card_price) values ('20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 'Orçamento de instalação', 'orcamento-instalacao', 'Agende uma avaliação', 'quote', null, null)$$,
  'Services tenant can create a quote-only service'
);
select is(public.get_public_storefront_by_domain('barber-test.example')->>'tenant_type', 'services', 'domain storefront returns the configured Services vertical');
select is(public.get_public_product_by_store_slug('barber-test', 'orcamento-instalacao')->'store'->>'tenant_type', 'services', 'service detail returns its configured vertical');
select throws_ok(
  $$update public.tenants set tenant_type = 'salon' where id = '20000000-0000-0000-0000-000000000004'$$,
  '23514', null, 'tenant vertical rejects values outside the supported three'
);
select throws_ok(
  $$update public.tenants set tenant_type = 'retail' where id = '20000000-0000-0000-0000-000000000004'$$,
  '23514', null, 'tenant cannot switch to Retail while it has quote-only services'
);
select lives_ok(
  $$insert into public.tenants (owner_id, name, slug) values ('10000000-0000-0000-0000-000000000002', 'Loja criada pelo admin', 'loja-admin')$$,
  'platform admin can create a tenant'
);

reset role;
select * from finish();
rollback;
