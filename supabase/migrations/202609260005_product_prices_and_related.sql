alter table public.products
  add column if not exists card_price numeric(12, 2);

update public.products
set card_price = price
where card_price is null;

alter table public.products
  alter column card_price set default 0,
  alter column card_price set not null,
  drop constraint if exists products_card_price_nonnegative_check,
  add constraint products_card_price_nonnegative_check check (card_price >= 0);

create or replace function public.get_public_storefront_payload(
  p_tenant_id uuid,
  p_limit integer,
  p_offset integer,
  p_category_id uuid,
  p_availability text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  safe_limit integer := greatest(1, least(coalesce(p_limit, 24), 48));
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  select jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'slug', t.slug,
    'domain', t.domain,
    'logo_url', t.logo_url,
    'primary_color', t.primary_color,
    'secondary_color', t.secondary_color,
    'whatsapp_number', t.whatsapp_number,
    'storefront_template', t.storefront_template,
    'storefront_config', t.storefront_config,
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) order by c.name)
      from public.categories c
      where c.tenant_id = t.id and c.active
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', page.id,
        'category_id', page.category_id,
        'category_name', c.name,
        'name', page.name,
        'slug', page.slug,
        'description', page.description,
        'price', page.price,
        'card_price', page.card_price,
        'image_url', coalesce(page.image_urls[1], page.image_url),
        'image_urls', case
          when cardinality(page.image_urls) > 0 then to_jsonb(page.image_urls)
          when page.image_url is not null then jsonb_build_array(page.image_url)
          else '[]'::jsonb
        end,
        'availability', page.availability,
        'product_condition', page.product_condition,
        'stock_quantity', page.stock_quantity,
        'featured', page.featured,
        'highlights', to_jsonb(page.highlights)
      ) order by page.created_at desc, page.id)
      from (
        select p.*
        from public.products p
        where p.tenant_id = t.id
          and p.active
          and (p_category_id is null or p.category_id = p_category_id)
          and (p_availability is null or p.availability = p_availability)
          and (p.category_id is null or exists (
            select 1 from public.categories active_category
            where active_category.id = p.category_id
              and active_category.tenant_id = t.id
              and active_category.active
          ))
        order by p.created_at desc, p.id
        limit safe_limit offset safe_offset
      ) page
      left join public.categories c on c.id = page.category_id and c.tenant_id = t.id and c.active
    ), '[]'::jsonb),
    'featured_products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', featured.id,
        'category_id', featured.category_id,
        'category_name', c.name,
        'name', featured.name,
        'slug', featured.slug,
        'description', featured.description,
        'price', featured.price,
        'card_price', featured.card_price,
        'image_url', coalesce(featured.image_urls[1], featured.image_url),
        'image_urls', case
          when cardinality(featured.image_urls) > 0 then to_jsonb(featured.image_urls)
          when featured.image_url is not null then jsonb_build_array(featured.image_url)
          else '[]'::jsonb
        end,
        'availability', featured.availability,
        'product_condition', featured.product_condition,
        'stock_quantity', featured.stock_quantity,
        'featured', featured.featured,
        'highlights', to_jsonb(featured.highlights)
      ) order by featured.created_at desc, featured.id)
      from (
        select p.*
        from public.products p
        where p.tenant_id = t.id
          and p.active
          and p.featured
          and (p.category_id is null or exists (
            select 1 from public.categories active_category
            where active_category.id = p.category_id
              and active_category.tenant_id = t.id
              and active_category.active
          ))
        order by p.created_at desc, p.id
        limit 4
      ) featured
      left join public.categories c on c.id = featured.category_id and c.tenant_id = t.id and c.active
    ), '[]'::jsonb),
    'total_products', (
      select count(*)
      from public.products p
      where p.tenant_id = t.id
        and p.active
        and (p_category_id is null or p.category_id = p_category_id)
        and (p_availability is null or p.availability = p_availability)
        and (p.category_id is null or exists (
          select 1 from public.categories active_category
          where active_category.id = p.category_id
            and active_category.tenant_id = t.id
            and active_category.active
        ))
    )
  )
  into result
  from public.tenants t
  where t.id = p_tenant_id and t.active;

  return result;
end;
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
      'detail_sections', coalesce(p.detail_sections, '[]'::jsonb)
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
        'highlights', to_jsonb(related.highlights)
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

revoke all on function public.get_public_storefront_payload(uuid, integer, integer, uuid, text) from public;
revoke all on function public.get_public_product_payload(uuid, text) from public;

notify pgrst, 'reload schema';
