# Configurable Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver a configurable multi-tenant storefront with Montserrat, curated templates, optional sections, product galleries and details, server-side catalog pagination, daily product view metrics, improved tenant selection, and a staged custom-domain workflow.

**Architecture:** Storefront content is loaded in Next.js Server Components from Supabase RPCs. Small client components handle gallery selection, cart interactions, and form previews. A database migration adds versioned template/configuration fields, product presentation fields, and daily aggregate metrics while preserving existing records.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase/Postgres, TypeScript, Zod, Tailwind CSS 4.

---

## Work sequence

### Workstream A: storefront and catalog

- Add an additive Supabase migration for niche templates, a validated JSON storefront configuration, product image arrays, availability, condition, stock, highlights, featured products, and daily product metrics.
- Update database types and public storefront schemas/RPCs to return typed data and a bounded product page.
- Add shared product-detail data access by tenant slug and custom domain; keep metadata generation server-side.
- Replace the all-client storefront with server-rendered layout, Technology/Nature/Sports/Essentials template variants, navigation derived from configured sections, static/split/carousel hero, categories, featured cards or mini-banners, configurable catalog grid, availability/category filter chips, about/contact sections, pagination, detailed footer, and WhatsApp contact.
- Add shareable product detail routes for tenant-slug URLs and custom-domain URLs. Add a focused client gallery and WhatsApp order button.
- Extend the product editor to upload and remove multiple photos, edit availability/condition/stock/highlights, and set a product as featured. The first retained photo remains the cover.
- Replace manual color pickers in settings with visual template choices and controls for section order/visibility, banner mode and images, section titles, catalog columns, social links, CNPJ and footer contact details.
- Add a reusable masked WhatsApp field and align common form layouts.

### Workstream B: tenant dashboard

- Resolve all tenants owned by the signed-in user and store the selected tenant in a secure, validated cookie.
- Add a store selector when the user owns more than one tenant.
- Increment daily product views from product detail requests using a constrained public database function.
- Add last-30-day totals and top-three products to the tenant dashboard, with empty states when there is no traffic.
- Make category controls use clear edit/save/cancel states and move long lists to server pagination.
- Paginate the product list and retain server-side sorting and filtering.
- Show links to the platform admin for platform administrators.

### Workstream C: platform admin and domains

- Add tenant activity summaries to the platform dashboard and keep the admin entry visible in navigation.
- Improve the new-tenant flow with consistent grid layout, masked WhatsApp, clear owner invitation state, back navigation, and optional logo upload.
- Add domain ownership instructions and a domain status display. Preserve path-based previews until a real domain is configured.
- Keep Vercel project-domain association manual until the project has a platform domain and explicit Vercel API credentials.

### Workstream D: responsive and performance pass

- Review storefront, product detail, settings, category management, tenant creation, and dashboards at narrow mobile, tablet, laptop, and desktop widths.
- Ensure only interactive controls hydrate on the client and images specify useful sizes and bounded formats.
- Check paginated screens, empty states, long text, and keyboard navigation.
- Run lint, production build, route checks, and visual browser review after the migration is applied locally or in a disposable local database.

## Delivery order

Implement Workstream A first because it defines the storefront data shape and tenant settings used by later dashboard and admin work. Continue with Workstream B, then Workstream C, and finish with the responsive/performance pass across all routes. Apply the additive Supabase migration before deploying dependent application code.
