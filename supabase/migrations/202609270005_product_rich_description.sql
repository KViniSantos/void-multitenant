alter table public.products
  add column if not exists rich_description jsonb,
  add constraint products_rich_description_valid
    check (
      rich_description is null
      or (
        jsonb_typeof(rich_description) = 'object'
        and pg_column_size(rich_description) <= 65536
      )
    );

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
      jsonb_set(
        p_payload,
        '{store,tenant_type}',
        to_jsonb(tenant.tenant_type),
        true
      ),
      '{product,pricing_mode}',
      to_jsonb(product.pricing_mode),
      true
    ),
    '{product,rich_description}',
    coalesce(product.rich_description, 'null'::jsonb),
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

revoke all on function public.decorate_public_product_payload(uuid, jsonb) from public;

notify pgrst, 'reload schema';
