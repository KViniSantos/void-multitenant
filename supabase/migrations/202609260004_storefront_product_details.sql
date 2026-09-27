alter table public.products
  add column if not exists detail_sections jsonb not null default '[]'::jsonb;

alter table public.products
  drop constraint if exists products_detail_sections_array_check;

alter table public.products
  add constraint products_detail_sections_array_check
  check (jsonb_typeof(detail_sections) = 'array');

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
      'detail_sections', coalesce(p.detail_sections, '[]'::jsonb)
    )
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
