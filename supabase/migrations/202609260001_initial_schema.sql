create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  platform_role text not null default 'user' check (platform_role in ('platform_admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug not in ('admin', 'dashboard', 'login', 'update-password', 'auth', '_next')),
  domain text,
  logo_url text,
  primary_color text not null default '#183F36' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#D6ED74' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  whatsapp_number text check (whatsapp_number is null or whatsapp_number ~ '^[1-9][0-9]{7,14}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_domain_format check (domain is null or (
    domain = lower(domain) and
    domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?[.])+[a-z]{2,63}$'
  ))
);

create unique index if not exists tenants_domain_unique on public.tenants (lower(domain)) where domain is not null;
create index if not exists tenants_owner_idx on public.tenants (owner_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 60),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug),
  unique (tenant_id, id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(trim(name)) between 2 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 2000),
  price numeric(12,2) not null check (price >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_category_same_tenant foreign key (tenant_id, category_id)
    references public.categories(tenant_id, id) on delete restrict,
  unique (tenant_id, slug)
);

create index if not exists categories_tenant_idx on public.categories (tenant_id);
create index if not exists products_tenant_idx on public.products (tenant_id, active, created_at desc);
create index if not exists products_category_idx on public.products (tenant_id, category_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at before update on public.tenants
for each row execute function public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email)
select id, lower(email) from auth.users
on conflict (id) do update set email = excluded.email;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and platform_role = 'platform_admin'
  );
$$;

create or replace function public.owns_tenant(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenants
    where id = p_tenant_id and owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.owns_tenant(uuid) from public;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.owns_tenant(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.tenants from anon, authenticated;
revoke all on public.categories from anon, authenticated;
revoke all on public.products from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.tenants to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.products to authenticated;

drop policy if exists profiles_read_self_or_platform_admin on public.profiles;
create policy profiles_read_self_or_platform_admin on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select public.is_platform_admin()));

drop policy if exists tenants_read_owner_or_admin on public.tenants;
create policy tenants_read_owner_or_admin on public.tenants
for select to authenticated
using (owner_id = (select auth.uid()) or (select public.is_platform_admin()));
drop policy if exists tenants_insert_platform_admin on public.tenants;
create policy tenants_insert_platform_admin on public.tenants
for insert to authenticated
with check ((select public.is_platform_admin()));
drop policy if exists tenants_update_owner_or_admin on public.tenants;
create policy tenants_update_owner_or_admin on public.tenants
for update to authenticated
using (owner_id = (select auth.uid()) or (select public.is_platform_admin()))
with check (owner_id = (select auth.uid()) or (select public.is_platform_admin()));

drop policy if exists categories_read_owner_or_admin on public.categories;
create policy categories_read_owner_or_admin on public.categories
for select to authenticated
using ((select public.owns_tenant(tenant_id)) or (select public.is_platform_admin()));
drop policy if exists categories_insert_owner_or_admin on public.categories;
create policy categories_insert_owner_or_admin on public.categories
for insert to authenticated
with check ((select public.owns_tenant(tenant_id)) or (select public.is_platform_admin()));
drop policy if exists categories_update_owner_or_admin on public.categories;
create policy categories_update_owner_or_admin on public.categories
for update to authenticated
using ((select public.owns_tenant(tenant_id)) or (select public.is_platform_admin()))
with check ((select public.owns_tenant(tenant_id)) or (select public.is_platform_admin()));
drop policy if exists categories_delete_owner_or_admin on public.categories;
create policy categories_delete_owner_or_admin on public.categories
for delete to authenticated
using ((select public.owns_tenant(tenant_id)) or (select public.is_platform_admin()));

drop policy if exists products_read_owner_or_admin on public.products;
create policy products_read_owner_or_admin on public.products
for select to authenticated
using ((select public.owns_tenant(tenant_id)) or (select public.is_platform_admin()));
drop policy if exists products_insert_owner_or_admin on public.products;
create policy products_insert_owner_or_admin on public.products
for insert to authenticated
with check ((select public.owns_tenant(tenant_id)) or (select public.is_platform_admin()));
drop policy if exists products_update_owner_or_admin on public.products;
create policy products_update_owner_or_admin on public.products
for update to authenticated
using ((select public.owns_tenant(tenant_id)) or (select public.is_platform_admin()))
with check ((select public.owns_tenant(tenant_id)) or (select public.is_platform_admin()));
drop policy if exists products_delete_owner_or_admin on public.products;
create policy products_delete_owner_or_admin on public.products
for delete to authenticated
using ((select public.owns_tenant(tenant_id)) or (select public.is_platform_admin()));

create or replace function public.get_public_storefront_by_domain(p_domain text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'slug', t.slug,
    'domain', t.domain,
    'logo_url', t.logo_url,
    'primary_color', t.primary_color,
    'secondary_color', t.secondary_color,
    'whatsapp_number', t.whatsapp_number,
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) order by c.name)
      from public.categories c where c.tenant_id = t.id and c.active
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'category_id', p.category_id, 'category_name', c.name,
        'name', p.name, 'slug', p.slug, 'description', p.description,
        'price', p.price, 'image_url', p.image_url
      ) order by p.created_at desc)
      from public.products p
      left join public.categories c on c.id = p.category_id and c.tenant_id = p.tenant_id and c.active
      where p.tenant_id = t.id and p.active and (p.category_id is null or c.id is not null)
    ), '[]'::jsonb)
  )
  from public.tenants t
  where t.active and t.domain = lower(trim(p_domain))
  limit 1;
$$;

create or replace function public.get_public_storefront_by_slug(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'slug', t.slug,
    'domain', t.domain,
    'logo_url', t.logo_url,
    'primary_color', t.primary_color,
    'secondary_color', t.secondary_color,
    'whatsapp_number', t.whatsapp_number,
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) order by c.name)
      from public.categories c where c.tenant_id = t.id and c.active
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'category_id', p.category_id, 'category_name', c.name,
        'name', p.name, 'slug', p.slug, 'description', p.description,
        'price', p.price, 'image_url', p.image_url
      ) order by p.created_at desc)
      from public.products p
      left join public.categories c on c.id = p.category_id and c.tenant_id = p.tenant_id and c.active
      where p.tenant_id = t.id and p.active and (p.category_id is null or c.id is not null)
    ), '[]'::jsonb)
  )
  from public.tenants t
  where t.active and t.slug = lower(trim(p_slug))
  limit 1;
$$;

revoke all on function public.get_public_storefront_by_domain(text) from public;
revoke all on function public.get_public_storefront_by_slug(text) from public;
grant execute on function public.get_public_storefront_by_domain(text) to anon, authenticated;
grant execute on function public.get_public_storefront_by_slug(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-assets', 'store-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists store_assets_public_read on storage.objects;
create policy store_assets_public_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'store-assets');

drop policy if exists store_assets_insert_owner_or_admin on storage.objects;
create policy store_assets_insert_owner_or_admin on storage.objects
for insert to authenticated
with check (
  bucket_id = 'store-assets' and (
    exists (select 1 from public.tenants t
      where t.id::text = (storage.foldername(name))[1] and t.owner_id = (select auth.uid()))
    or (select public.is_platform_admin())
  )
);

drop policy if exists store_assets_update_owner_or_admin on storage.objects;
create policy store_assets_update_owner_or_admin on storage.objects
for update to authenticated
using (
  bucket_id = 'store-assets' and (
    exists (select 1 from public.tenants t
      where t.id::text = (storage.foldername(name))[1] and t.owner_id = (select auth.uid()))
    or (select public.is_platform_admin())
  )
)
with check (
  bucket_id = 'store-assets' and (
    exists (select 1 from public.tenants t
      where t.id::text = (storage.foldername(name))[1] and t.owner_id = (select auth.uid()))
    or (select public.is_platform_admin())
  )
);

drop policy if exists store_assets_delete_owner_or_admin on storage.objects;
create policy store_assets_delete_owner_or_admin on storage.objects
for delete to authenticated
using (
  bucket_id = 'store-assets' and (
    exists (select 1 from public.tenants t
      where t.id::text = (storage.foldername(name))[1] and t.owner_id = (select auth.uid()))
    or (select public.is_platform_admin())
  )
);
