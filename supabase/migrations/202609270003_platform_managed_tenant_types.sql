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
