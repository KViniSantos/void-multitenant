alter table public.tenants
  add column tenant_type text not null default 'retail'
    constraint tenants_tenant_type_check check (tenant_type in ('retail', 'food', 'services'));

alter table public.products
  add column pricing_mode text not null default 'fixed'
    constraint products_pricing_mode_check check (pricing_mode in ('fixed', 'starting_at', 'quote')),
  alter column price drop not null,
  alter column card_price drop not null,
  alter column card_price drop default,
  add constraint products_pricing_mode_values_check check (
    (pricing_mode = 'quote' and price is null and card_price is null)
    or (pricing_mode in ('fixed', 'starting_at') and price is not null)
  );

create or replace function public.validate_catalog_pricing_for_tenant()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_tenant_type text;
begin
  select t.tenant_type into current_tenant_type
  from public.tenants t
  where t.id = new.tenant_id;

  if not found then
    raise exception 'Tenant not found for catalog entry.' using errcode = '23503';
  end if;

  if current_tenant_type in ('retail', 'food') then
    if new.pricing_mode <> 'fixed' or new.price is null or new.card_price is null then
      raise exception 'Retail and Food entries require a fixed price.' using errcode = '23514';
    end if;
  elsif current_tenant_type = 'services' then
    if new.pricing_mode = 'quote' and (new.price is not null or new.card_price is not null) then
      raise exception 'Quote-only services cannot store a numeric price.' using errcode = '23514';
    end if;
    if new.pricing_mode in ('fixed', 'starting_at') and new.price is null then
      raise exception 'This service pricing mode requires a price.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger products_validate_vertical_pricing
before insert or update of tenant_id, pricing_mode, price, card_price on public.products
for each row execute function public.validate_catalog_pricing_for_tenant();

create or replace function public.validate_tenant_type_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only a platform administrator can change the tenant type.' using errcode = '42501';
  end if;

  if new.tenant_type in ('retail', 'food') and exists (
    select 1
    from public.products p
    where p.tenant_id = new.id
      and (p.pricing_mode <> 'fixed' or p.price is null or p.card_price is null)
  ) then
    raise exception 'Convert catalog entries to fixed prices before changing this tenant to Retail or Food.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tenants_validate_type_change
before update of tenant_type on public.tenants
for each row when (old.tenant_type is distinct from new.tenant_type)
execute function public.validate_tenant_type_change();

create or replace function public.decorate_public_catalog_products(p_tenant_id uuid, p_products jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      item.value || jsonb_build_object('pricing_mode', product.pricing_mode)
      order by item.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) with ordinality as item(value, ordinality)
  join public.products product
    on product.id = (item.value->>'id')::uuid
   and product.tenant_id = p_tenant_id;
$$;

create or replace function public.decorate_public_storefront_payload(p_tenant_id uuid, p_payload jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_set(
    jsonb_set(
      jsonb_set(
        p_payload,
        '{tenant_type}',
        to_jsonb(tenant.tenant_type),
        true
      ),
      '{products}',
      public.decorate_public_catalog_products(p_tenant_id, p_payload->'products'),
      true
    ),
    '{featured_products}',
    public.decorate_public_catalog_products(p_tenant_id, p_payload->'featured_products'),
    true
  )
  from public.tenants tenant
  where tenant.id = p_tenant_id and tenant.active;
$$;

create or replace function public.decorate_public_product_payload(p_tenant_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  select jsonb_set(
    jsonb_set(
      p_payload,
      '{store,tenant_type}',
      to_jsonb(tenant.tenant_type),
      true
    ),
    '{product,pricing_mode}',
    to_jsonb(product.pricing_mode),
    true
  )
  into result
  from public.tenants tenant
  join public.products product on product.tenant_id = tenant.id
  where tenant.id = p_tenant_id
    and tenant.active
    and product.id = (p_payload->'product'->>'id')::uuid
    and product.active;

  if result is null then
    return null;
  end if;

  return jsonb_set(
    result,
    '{related_products}',
    public.decorate_public_catalog_products(p_tenant_id, result->'related_products'),
    true
  );
end;
$$;

revoke all on function public.decorate_public_catalog_products(uuid, jsonb) from public;
revoke all on function public.decorate_public_storefront_payload(uuid, jsonb) from public;
revoke all on function public.decorate_public_product_payload(uuid, jsonb) from public;

create or replace function public.get_public_storefront_by_slug_page(
  p_slug text,
  p_limit integer,
  p_offset integer,
  p_category_id uuid,
  p_availability text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.decorate_public_storefront_payload(
    tenant.id,
    public.get_public_storefront_payload(tenant.id, p_limit, p_offset, p_category_id, p_availability)
  )
  from public.tenants tenant
  where tenant.active and tenant.slug = lower(trim(p_slug))
  limit 1;
$$;

create or replace function public.get_public_storefront_by_domain_page(
  p_domain text,
  p_limit integer,
  p_offset integer,
  p_category_id uuid,
  p_availability text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.decorate_public_storefront_payload(
    tenant.id,
    public.get_public_storefront_payload(tenant.id, p_limit, p_offset, p_category_id, p_availability)
  )
  from public.tenants tenant
  where tenant.active and tenant.domain = lower(trim(p_domain))
  limit 1;
$$;

create or replace function public.get_public_storefront_by_slug(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_public_storefront_by_slug_page(p_slug, 24, 0, null, null);
$$;

create or replace function public.get_public_storefront_by_domain(p_domain text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_public_storefront_by_domain_page(p_domain, 24, 0, null, null);
$$;

create or replace function public.get_public_product_by_store_slug(p_store_slug text, p_product_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.decorate_public_product_payload(
    tenant.id,
    public.get_public_product_payload(tenant.id, p_product_slug)
  )
  from public.tenants tenant
  where tenant.active and tenant.slug = lower(trim(p_store_slug))
  limit 1;
$$;

create or replace function public.get_public_product_by_domain(p_domain text, p_product_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.decorate_public_product_payload(
    tenant.id,
    public.get_public_product_payload(tenant.id, p_product_slug)
  )
  from public.tenants tenant
  where tenant.active and tenant.domain = lower(trim(p_domain))
  limit 1;
$$;

notify pgrst, 'reload schema';
