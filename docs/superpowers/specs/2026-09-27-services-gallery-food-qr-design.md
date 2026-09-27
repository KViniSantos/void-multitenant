# Services Gallery and Food QR Design

## Goal

Finish two focused capabilities in the existing multi-tenant storefront: a small, configurable company photo gallery for Services tenants and a downloadable public-store QR code for Food tenants. Preserve the current Retail experience, tenant authorization, public URL routing, and production data.

## Current architecture

- Tenant visual settings are stored in `tenants.storefront_config` as JSONB. The public storefront RPCs already return this config for both slug and custom-domain routes.
- Settings are edited in one dashboard form. Its sections can be enabled, titled, and reordered; the current set includes categories, featured items, catalog, about, and contact.
- The shared `store-assets` Supabase Storage bucket is public-read for storefront media. Uploads are limited to JPEG, PNG, WebP, or AVIF and 5 MB. Write and delete policies require the first storage path segment to identify a tenant owned by the authenticated user, or a platform administrator.
- Storefront public paths already resolve by tenant slug on the platform host and by hostname on a connected custom domain. `NEXT_PUBLIC_SITE_URL` is already used as the canonical platform URL elsewhere in the application.
- Dashboard pages use the authenticated tenant context, and dashboard navigation receives the tenant type.
- The SQL tests use rollback transactions and already include Retail (`Joao Tech`), Food (`Burger Test`), and Services (`Barber Test`) fixtures.

## Chosen design

### Services photo gallery

Add `sections.gallery` to the existing storefront config with `enabled`, `title`, and an ordered `image_urls` list. Add `gallery` to the configurable section order and a `show_gallery_link` navigation option. Older tenant configs that lack these fields receive defaults during parsing and retain their other saved settings.

Show gallery controls only to Services tenants. Owners can enable or disable the gallery, edit its title, add or remove images, and reorder the section with the existing settings controls. Allow at most eight images, using the existing image formats, file-size limit, upload helper, bucket, and tenant-prefixed storage paths under `{tenantId}/gallery/`. The public Services storefront renders the section only when it is enabled and has images; other verticals do not render it.

The settings action validates every gallery URL against the configured Supabase origin, the current tenant ID, the `store-assets` bucket, and the `gallery` folder before saving. Cross-tenant, external, or malformed URLs are rejected. Newly uploaded objects are removed if the settings save fails. After a successful save, gallery objects removed from the saved configuration are deleted through the existing authenticated, tenant-scoped Storage policy. Gallery media remains public because it is marketing content displayed in the public storefront.

No table, bucket, or Storage policy migration is needed: the existing bucket limits and tenant path authorization cover the new folder. Keep the gallery image-only. Video upload, scheduling, appointments, and a page builder remain out of scope.

### Food QR page

Add an authenticated `/dashboard/qr-code` route and expose its dashboard navigation link only for Food tenants. The server page rejects access from Retail and Services tenants even when the route is entered directly.

Build the absolute storefront URL from the tenant's configured custom domain when present, using HTTPS. Otherwise, use the canonical origin in `NEXT_PUBLIC_SITE_URL` and append `/{tenant.slug}`. Generate the QR image locally in the browser with a small QR library; do not send the URL to a third-party QR service or persist QR images. Show the resolved URL, short usage instructions, a copy action, and a PNG download action.

The QR contains only the store's public URL. If URL generation or QR rendering fails, show an actionable error without blocking the rest of the dashboard.

## Alternatives considered

1. **Gallery in existing JSONB config and current bucket (chosen):** reuses the form, RPC payload, tenant path policy, and bucket limits; requires no database migration and is sufficient for a small ordered image set.
2. **A relational media table:** supports per-image captions and richer metadata, but adds a migration, queries, policies, and CRUD that this gallery does not need.
3. **A hosted QR generation endpoint:** avoids a browser dependency, but gives a third party the store URL and adds an external runtime dependency. Local generation is small and works without a network request.

## Data safety, errors, and performance

- Derive the tenant ID from the authenticated server context; never accept a tenant ID from a submitted form as authorization.
- Validate gallery URLs on the server even though the browser uploader also checks file size, MIME type, and image signatures.
- Rely on the existing tenant-scoped Storage insert and delete policies. Do not broaden public access or add a bucket.
- Do not change the existing public RPC shape or add demo rows to a live Supabase project.
- Limit the gallery to eight optimized images so its public payload stays small. Load the QR generator only on the Food QR dashboard page and generate its image on demand.
- Leave database and tenant content unchanged on failed settings saves; clean up newly uploaded objects when the save is rejected.

## Out of scope

Online payments, service appointments, availability calendars, delivery or inventory workflows, video media, multi-image captions, gallery analytics, a new media table, a new Storage bucket, or production demo tenants.

## Acceptance checks

1. An existing tenant config without gallery fields continues to render its saved theme, settings, and sections.
2. A Services owner can configure an ordered gallery of up to eight images; invalid or cross-tenant URLs cannot be saved.
3. The Services public storefront shows the gallery only when enabled and populated, and its link matches the configured section state.
4. Retail and Food storefronts and their existing cart/order flows are unchanged.
5. Only Food tenants see and can open `/dashboard/qr-code`.
6. A Food tenant with a custom domain gets a QR for that domain; without one, it gets the canonical platform URL plus its slug.
7. The QR can be downloaded as a PNG and is generated without contacting an external QR service.
8. Gallery additions and removals preserve tenant isolation; a failed save cleans up newly uploaded gallery objects.
9. Tests use rollback-only fixtures for `Joao Tech`, `Burger Test`, and `Barber Test`; no demo tenants or products are inserted into production.
10. Existing tenant isolation tests, application tests, lint, type checking, and a production build pass.
