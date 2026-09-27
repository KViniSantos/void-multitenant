begin;
select plan(8);

select has_column('public', 'tenants', 'storefront_template', 'tenants store a curated template choice');
select has_column('public', 'tenants', 'storefront_config', 'store owners can configure sections and footer details');
select has_column('public', 'products', 'image_urls', 'products can have an ordered image gallery');
select has_column('public', 'products', 'availability', 'products expose a stock availability state');
select has_column('public', 'products', 'featured', 'products can be featured on the storefront');
select has_function('public', 'get_public_storefront_by_slug_page', array['text', 'integer', 'integer', 'uuid', 'text'], 'public catalog is paginated and filterable');
select has_function('public', 'increment_product_view', array['uuid', 'uuid'], 'product page views can be aggregated');
select has_function('public', 'get_platform_product_metrics', array['date'], 'platform administrators can review aggregate product traffic');

select * from finish();
rollback;
