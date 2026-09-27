alter table public.tenants
  alter column storefront_config set default '{
    "navigation": {"show_home_link": true, "show_category_links": true, "show_category_filters": true, "show_featured_link": true, "show_about_link": false, "show_contact_link": true, "show_whatsapp_cta": true},
    "hero": {"enabled": true, "mode": "split", "title": "Escolhas feitas para você.", "description": "Conheça nossa seleção e fale com a loja pelo WhatsApp.", "cta_label": "Explorar produtos", "image_urls": []},
    "sections": {
      "categories": {"enabled": true, "title": "Categorias"},
      "featured": {"enabled": true, "title": "Produtos em destaque", "layout": "cards"},
      "catalog": {"enabled": true, "title": "Todos os produtos", "columns": 4},
      "about": {"enabled": false, "title": "Sobre a loja", "text": "", "image_url": null},
      "contact": {"enabled": true, "title": "Fale com a gente"}
    },
    "section_order": ["categories", "featured", "catalog", "about", "contact"],
    "footer": {"enabled": true, "show_logo": true, "show_categories": true, "show_contact": true, "cnpj": "", "hours": "", "email": "", "address": "", "instagram": "", "facebook": "", "tiktok": "", "youtube": "", "show_platform_credit": true}
  }'::jsonb;

update public.tenants
set storefront_config = jsonb_set(
  storefront_config,
  '{navigation}',
  '{"show_home_link":true,"show_category_links":true,"show_category_filters":true,"show_featured_link":true,"show_about_link":false,"show_contact_link":true,"show_whatsapp_cta":true}'::jsonb || coalesce(storefront_config -> 'navigation', '{}'::jsonb),
  true
)
where not (coalesce(storefront_config -> 'navigation', '{}'::jsonb) ? 'show_home_link')
   or not (coalesce(storefront_config -> 'navigation', '{}'::jsonb) ? 'show_category_links')
   or not (coalesce(storefront_config -> 'navigation', '{}'::jsonb) ? 'show_category_filters')
   or not (coalesce(storefront_config -> 'navigation', '{}'::jsonb) ? 'show_featured_link')
   or not (coalesce(storefront_config -> 'navigation', '{}'::jsonb) ? 'show_about_link')
   or not (coalesce(storefront_config -> 'navigation', '{}'::jsonb) ? 'show_contact_link')
   or not (coalesce(storefront_config -> 'navigation', '{}'::jsonb) ? 'show_whatsapp_cta');

notify pgrst, 'reload schema';
