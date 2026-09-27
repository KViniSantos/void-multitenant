create or replace function public.validate_catalog_pricing_for_tenant()
returns trigger
language plpgsql
security definer
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
