alter table public.products
  add column if not exists attributes jsonb not null default '[]'::jsonb;

alter table public.products
  drop constraint if exists products_attributes_array_check,
  add constraint products_attributes_array_check check (jsonb_typeof(attributes) = 'array');

create or replace function public.add_public_product_attributes(p_tenant_id uuid, p_products jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    item.value || jsonb_build_object('attributes', to_jsonb(p.attributes))
    order by item.ordinality
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) with ordinality as item(value, ordinality)
  join public.products p on p.id = (item.value ->> 'id')::uuid and p.tenant_id = p_tenant_id;
$$;

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
  with store_payload as (
    select t.id as tenant_id,
      public.get_public_storefront_payload(t.id, p_limit, p_offset, p_category_id, p_availability) as payload
    from public.tenants t
    where t.active and t.slug = lower(trim(p_slug))
    limit 1
  )
  select jsonb_set(
    jsonb_set(payload, '{products}', public.add_public_product_attributes(tenant_id, payload -> 'products'), true),
    '{featured_products}', public.add_public_product_attributes(tenant_id, payload -> 'featured_products'), true
  )
  from store_payload;
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
  with store_payload as (
    select t.id as tenant_id,
      public.get_public_storefront_payload(t.id, p_limit, p_offset, p_category_id, p_availability) as payload
    from public.tenants t
    where t.active and t.domain = lower(trim(p_domain))
    limit 1
  )
  select jsonb_set(
    jsonb_set(payload, '{products}', public.add_public_product_attributes(tenant_id, payload -> 'products'), true),
    '{featured_products}', public.add_public_product_attributes(tenant_id, payload -> 'featured_products'), true
  )
  from store_payload;
$$;

create or replace function public.get_public_product_payload(p_tenant_id uuid, p_product_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'store', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'slug', t.slug,
      'domain', t.domain,
      'logo_url', t.logo_url,
      'primary_color', t.primary_color,
      'secondary_color', t.secondary_color,
      'storefront_template', t.storefront_template,
      'whatsapp_number', t.whatsapp_number,
      'storefront_config', t.storefront_config
    ),
    'product', jsonb_build_object(
      'id', p.id,
      'tenant_id', p.tenant_id,
      'category_id', p.category_id,
      'category_name', c.name,
      'name', p.name,
      'slug', p.slug,
      'description', p.description,
      'price', p.price,
      'card_price', p.card_price,
      'image_url', coalesce(p.image_urls[1], p.image_url),
      'image_urls', case
        when cardinality(p.image_urls) > 0 then to_jsonb(p.image_urls)
        when p.image_url is not null then jsonb_build_array(p.image_url)
        else '[]'::jsonb
      end,
      'availability', p.availability,
      'product_condition', p.product_condition,
      'stock_quantity', p.stock_quantity,
      'featured', p.featured,
      'highlights', to_jsonb(p.highlights),
      'detail_sections', coalesce(p.detail_sections, '[]'::jsonb),
      'attributes', coalesce(p.attributes, '[]'::jsonb)
    ),
    'related_products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', related.id,
        'category_id', related.category_id,
        'category_name', related.category_name,
        'name', related.name,
        'slug', related.slug,
        'description', related.description,
        'price', related.price,
        'card_price', related.card_price,
        'image_url', coalesce(related.image_urls[1], related.image_url),
        'image_urls', case
          when cardinality(related.image_urls) > 0 then to_jsonb(related.image_urls)
          when related.image_url is not null then jsonb_build_array(related.image_url)
          else '[]'::jsonb
        end,
        'availability', related.availability,
        'product_condition', related.product_condition,
        'stock_quantity', related.stock_quantity,
        'featured', related.featured,
        'highlights', to_jsonb(related.highlights),
        'attributes', coalesce(related.attributes, '[]'::jsonb)
      ) order by related.category_priority, related.featured desc, related.created_at desc, related.id)
      from (
        select rp.*, rc.name as category_name,
          case when p.category_id is not null and rp.category_id = p.category_id then 0 else 1 end as category_priority
        from public.products rp
        left join public.categories rc on rc.id = rp.category_id and rc.tenant_id = t.id and rc.active
        where rp.tenant_id = t.id
          and rp.active
          and rp.id <> p.id
          and (rp.category_id is null or rc.id is not null)
        order by category_priority, rp.featured desc, rp.created_at desc, rp.id
        limit 4
      ) related
    ), '[]'::jsonb)
  )
  from public.tenants t
  join public.products p on p.tenant_id = t.id
  left join public.categories c on c.id = p.category_id and c.tenant_id = t.id and c.active
  where t.id = p_tenant_id
    and t.active
    and p.active
    and p.slug = lower(trim(p_product_slug))
    and (p.category_id is null or c.id is not null)
  limit 1;
$$;

revoke all on function public.add_public_product_attributes(uuid, jsonb) from public;
revoke all on function public.get_public_storefront_by_slug_page(text, integer, integer, uuid, text) from public;
revoke all on function public.get_public_storefront_by_domain_page(text, integer, integer, uuid, text) from public;
revoke all on function public.get_public_product_payload(uuid, text) from public;

grant execute on function public.get_public_storefront_by_slug_page(text, integer, integer, uuid, text) to anon, authenticated;
grant execute on function public.get_public_storefront_by_domain_page(text, integer, integer, uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
