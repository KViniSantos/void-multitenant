# Multi-vertical storefront design

## Goal

Evolve the existing multi-tenant SaaS so one application serves Retail, Food, and Services tenants, each with a storefront and dashboard language suited to its business, while retaining the existing shared Supabase, authentication, RLS, storage, domains, branding, and WhatsApp core.

## Current architecture

- `tenants.storefront_template` selects one of the existing visual skins (`technology`, `nature`, `sports`, `essentials`). It is not the business vertical.
- Tenants, categories, catalog entries (`products`), settings, and public storefront data already use a shared schema and tenant-scoped row-level security.
- Public storefronts are loaded through restricted SQL functions by custom domain or slug. Platform hosts render the landing page; tenant hosts render a tenant storefront.
- The dashboard, editor, cart, and product detail currently use Retail language and behavior.

## Chosen design

Add `tenants.tenant_type` with values `retail`, `food`, and `services`, defaulting to `retail`. Keep `storefront_template` as the visual skin so existing tenants and their personalization remain unchanged. Add `tenant_type` to admin create/edit, dashboard context, and restricted public RPC payloads. Existing rows migrate to Retail.

Continue to store all catalog entries in `products` and reuse tenant-scoped categories. Add a checked `pricing_mode` for `fixed`, `starting_at`, and `quote`. Make `price` and `card_price` nullable only for the `quote` case; old rows keep their values and use `fixed`. Retail and Food accept only fixed prices. Services can use a fixed amount, “A partir de”, or “Consultar”. Server actions derive the tenant from the authenticated server context and validate pricing rules against its `tenant_type`; they never trust a tenant id from the browser.

Render three distinct public experiences from the resolved tenant type:

- **Retail:** keep the current product catalog, pricing, product details, cart, and WhatsApp checkout unchanged.
- **Food:** render a digital menu with category navigation and compact food item cards; item details and cart remain available, with an order-oriented WhatsApp message. Do not add modifiers, delivery fees, schedules, or payments.
- **Services:** render a professional service catalog and existing business information; each service sends a direct WhatsApp inquiry with a message appropriate to its price mode. Do not show a cart or implement scheduling.

Update admin tenant lists/forms and tenant dashboard navigation, metadata, and product editor labels based on vertical. Keep existing domains, custom-domain resolution, slug fallback, branding settings, categories, and RLS policies. Public SQL functions continue returning only their existing safe fields plus the vertical and pricing mode.

## Alternatives considered

1. **Shared catalog with vertical-specific rendering and pricing mode (chosen):** smallest schema and policy surface; preserves existing content and allows verticals to share categories, images, and CRUD.
2. **Separate food and service tables:** clearer specialized schemas, but duplicates CRUD, categories, RLS policies, public RPCs, and media handling without enough need for the MVP.
3. **Keep one generic Retail storefront and only rename labels:** smallest code change, but it does not deliver a menu UX or a direct service inquiry flow.

## Data safety and validation

- Migration defaults every existing tenant to `retail`; no existing theme, price, category, product, domain, or branding value is rewritten.
- Custom-domain and slug resolution continue to gate public access on an active tenant and active catalog entries.
- Tenant ownership, authorization, and RLS remain enforced server-side. Public RPC results remain tenant-scoped and do not expose owner data.
- Demo examples are fixture data for local/database tests; do not create fictional businesses in the production database or claim to configure their domains/DNS.

## Out of scope

Online payment, stock/ERP, delivery fees, restaurant modifiers or combos, calendars, appointments, employees, availability scheduling, marketplace discovery, page builder, CRM, coupons, or loyalty features.

## Acceptance checks

1. Admin can create and change each tenant type; existing tenants resolve as Retail.
2. A Retail tenant retains its current public flow and prices.
3. Food lists categories and menu entries, opens details, adds/removes/changes cart quantities, and builds a WhatsApp order message.
4. Services supports fixed, starting-at, and quote prices; sends correctly encoded WhatsApp inquiries; does not show cart controls.
5. Tenant dashboard terms match the tenant type.
6. Public slug and custom-domain lookup include the correct type and do not cross tenant boundaries.
7. Supabase database tests, app tests, lint, typecheck, and production build pass.
