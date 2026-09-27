alter table public.tenants
  add column if not exists storefront_template text not null default 'essentials'
    check (storefront_template in ('technology', 'nature', 'sports', 'essentials')),
  add column if not exists storefront_config jsonb not null default '{
    "navigation": {"show_home_link": true, "show_category_links": true, "show_category_filters": true, "show_featured_link": true, "show_about_link": false, "show_contact_link": true, "show_whatsapp_cta": true},
    "hero": {
      "enabled": true,
      "mode": "split",
      "title": "Escolhas feitas para você.",
      "description": "Conheça nossa seleção e fale com a loja pelo WhatsApp.",
      "cta_label": "Explorar produtos",
      "image_urls": []
    },
    "sections": {
      "categories": {"enabled": true, "title": "Categorias"},
      "featured": {"enabled": true, "title": "Produtos em destaque", "layout": "cards"},
      "catalog": {"enabled": true, "title": "Todos os produtos", "columns": 4},
      "about": {"enabled": false, "title": "Sobre a loja", "text": "", "image_url": null},
      "contact": {"enabled": true, "title": "Fale com a gente"}
    },
    "section_order": ["categories", "featured", "catalog", "about", "contact"],
    "footer": {
      "enabled": true,
      "show_logo": true,
      "show_categories": true,
      "show_contact": true,
      "cnpj": "",
      "hours": "",
      "email": "",
      "address": "",
      "instagram": "",
      "facebook": "",
      "tiktok": "",
      "youtube": "",
      "show_platform_credit": true
    }
  }'::jsonb
    check (jsonb_typeof(storefront_config) = 'object');

alter table public.products
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists availability text not null default 'in_stock'
    check (availability in ('in_stock', 'preorder', 'sold_out')),
  add column if not exists product_condition text not null default 'new'
    check (product_condition in ('new', 'used', 'refurbished')),
  add column if not exists stock_quantity integer
    check (stock_quantity is null or stock_quantity >= 0),
  add column if not exists featured boolean not null default false,
  add column if not exists highlights text[] not null default '{}';

update public.products
set image_urls = array[image_url]
where image_url is not null and cardinality(image_urls) = 0;

create index if not exists products_featured_idx
  on public.products (tenant_id, featured, created_at desc)
  where active and featured;

create table if not exists public.product_daily_metrics (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  metric_date date not null,
  views bigint not null default 0 check (views >= 0),
  primary key (tenant_id, product_id, metric_date)
);

create index if not exists product_daily_metrics_tenant_date_idx
  on public.product_daily_metrics (tenant_id, metric_date desc);

alter table public.product_daily_metrics enable row level security;
revoke all on public.product_daily_metrics from anon, authenticated;
grant select on public.product_daily_metrics to authenticated;

drop policy if exists product_daily_metrics_read_owner_or_admin on public.product_daily_metrics;
create policy product_daily_metrics_read_owner_or_admin on public.product_daily_metrics
for select to authenticated
using ((select public.owns_tenant(tenant_id)) or (select public.is_platform_admin()));

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
  select public.get_public_storefront_payload(t.id, p_limit, p_offset, p_category_id, p_availability)
  from public.tenants t
  where t.active and t.slug = lower(trim(p_slug))
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
  select public.get_public_storefront_payload(t.id, p_limit, p_offset, p_category_id, p_availability)
  from public.tenants t
  where t.active and t.domain = lower(trim(p_domain))
  limit 1;
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
      'highlights', to_jsonb(p.highlights)
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

create or replace function public.get_public_product_by_store_slug(p_store_slug text, p_product_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_public_product_payload(t.id, p_product_slug)
  from public.tenants t
  where t.active and t.slug = lower(trim(p_store_slug))
  limit 1;
$$;

create or replace function public.get_public_product_by_domain(p_domain text, p_product_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_public_product_payload(t.id, p_product_slug)
  from public.tenants t
  where t.active and t.domain = lower(trim(p_domain))
  limit 1;
$$;

create or replace function public.increment_product_view(p_tenant_id uuid, p_product_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.product_daily_metrics (tenant_id, product_id, metric_date, views)
  select p.tenant_id, p.id, (now() at time zone 'UTC')::date, 1
  from public.products p
  join public.tenants t on t.id = p.tenant_id
  where p.id = p_product_id
    and p.tenant_id = p_tenant_id
    and p.active
    and t.active
  on conflict (tenant_id, product_id, metric_date)
  do update set views = public.product_daily_metrics.views + 1;
$$;

create or replace function public.get_tenant_product_metrics(p_tenant_id uuid, p_since date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and (t.owner_id = (select auth.uid()) or (select public.is_platform_admin()))
  ) then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'views', coalesce(sum(m.views), 0),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id', top.id,
        'name', top.name,
        'views', top.views,
        'image_url', top.image_url
      ) order by top.views desc, top.name)
      from (
        select p.id, p.name, coalesce(p.image_urls[1], p.image_url) as image_url,
          sum(pm.views)::bigint as views
        from public.product_daily_metrics pm
        join public.products p on p.id = pm.product_id and p.tenant_id = pm.tenant_id
        where pm.tenant_id = p_tenant_id
          and pm.metric_date >= coalesce(p_since, current_date - 29)
        group by p.id, p.name, p.image_urls, p.image_url
        order by sum(pm.views) desc, p.name
        limit 3
      ) top
    ), '[]'::jsonb)
  )
  into result
  from public.product_daily_metrics m
  where m.tenant_id = p_tenant_id
    and m.metric_date >= coalesce(p_since, current_date - 29);

  return result;
end;
$$;

create or replace function public.get_platform_product_metrics(p_since date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not (select public.is_platform_admin()) then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'views', coalesce((select sum(views) from public.product_daily_metrics where metric_date >= coalesce(p_since, current_date - 29)), 0),
    'top_tenants', coalesce((
      select jsonb_agg(jsonb_build_object('tenant_id', top.id, 'name', top.name, 'views', top.views) order by top.views desc, top.name)
      from (
        select t.id, t.name, sum(m.views)::bigint as views
        from public.product_daily_metrics m
        join public.tenants t on t.id = m.tenant_id
        where m.metric_date >= coalesce(p_since, current_date - 29)
        group by t.id, t.name
        order by sum(m.views) desc, t.name
        limit 5
      ) top
    ), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object('product_id', top.product_id, 'product_name', top.product_name, 'tenant_name', top.tenant_name, 'views', top.views) order by top.views desc, top.product_name)
      from (
        select p.id as product_id, p.name as product_name, t.name as tenant_name, sum(m.views)::bigint as views
        from public.product_daily_metrics m
        join public.products p on p.id = m.product_id and p.tenant_id = m.tenant_id
        join public.tenants t on t.id = m.tenant_id
        where m.metric_date >= coalesce(p_since, current_date - 29)
        group by p.id, p.name, t.name
        order by sum(m.views) desc, p.name
        limit 5
      ) top
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_public_storefront_payload(uuid, integer, integer, uuid, text) from public;
revoke all on function public.get_public_product_payload(uuid, text) from public;
revoke all on function public.get_public_storefront_by_slug_page(text, integer, integer, uuid, text) from public;
revoke all on function public.get_public_storefront_by_domain_page(text, integer, integer, uuid, text) from public;
revoke all on function public.get_public_product_by_store_slug(text, text) from public;
revoke all on function public.get_public_product_by_domain(text, text) from public;
revoke all on function public.increment_product_view(uuid, uuid) from public;
revoke all on function public.get_tenant_product_metrics(uuid, date) from public;
revoke all on function public.get_platform_product_metrics(date) from public;

grant execute on function public.get_public_storefront_by_slug_page(text, integer, integer, uuid, text) to anon, authenticated;
grant execute on function public.get_public_storefront_by_domain_page(text, integer, integer, uuid, text) to anon, authenticated;
grant execute on function public.get_public_product_by_store_slug(text, text) to anon, authenticated;
grant execute on function public.get_public_product_by_domain(text, text) to anon, authenticated;
grant execute on function public.increment_product_view(uuid, uuid) to anon, authenticated;
grant execute on function public.get_tenant_product_metrics(uuid, date) to authenticated;
grant execute on function public.get_platform_product_metrics(date) to authenticated;

notify pgrst, 'reload schema';
