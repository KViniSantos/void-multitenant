# Multi-vertical storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Retail, Food, and Services tenant types to the existing SaaS with safe shared data, distinct storefront UX, matching dashboard language, and WhatsApp flows.

**Architecture:** Keep the current tenant, category, and product tables, Supabase RLS, restricted public RPCs, and slug/domain lookup. Add a tenant vertical separate from the existing visual skin, plus a product pricing mode needed for Services; render vertical-specific storefronts and dashboard labels without changing Retail behavior.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase PostgreSQL/RLS, SQL migrations, Node test runner, ESLint.

---

### Task 1: Database contract and tenant vertical

**Files:**
- Create: `supabase/migrations/202609270002_multi_vertical_storefront.sql`
- Modify: `lib/database.types.ts`
- Modify: `lib/validation.ts`
- Modify: `app/actions/admin.ts`
- Modify: `components/admin-tenant-form.tsx`
- Modify: `app/admin/tenants/[id]/page.tsx`
- Modify: `app/admin/tenants/page.tsx`
- Modify: `lib/storefront-data.ts`
- Modify: public storefront SQL functions in the migration
- Test: `supabase/tests/storefront_v2.test.sql`

- [ ] Add database assertions first: existing tenants default to Retail; Food and Services enum-like checks accept valid values and reject invalid values; public slug/domain RPCs return the correct type.
- [ ] Run `npx supabase test db` and confirm the new assertions fail because the column and payload field do not exist.
- [ ] Add `tenant_type text not null default 'retail' check (tenant_type in ('retail','food','services'))`; update the public storefront and product-detail RPC payloads to include the field without exposing owner data.
- [ ] Add the `TenantType` TypeScript union and require `tenant_type` in tenant, brand, and public-store types.
- [ ] Add tenant type to create/update Zod parsing and admin forms; require a valid choice and display the type in the admin tenant list.
- [ ] Parse the new public payload using the existing Zod schemas and retain slug/domain resolution unchanged.
- [ ] Run `npx supabase test db`, `npm run lint`, and `npx tsc --noEmit`; fix failures before Task 2.

### Task 2: Catalog pricing contract for Services

**Files:**
- Modify: `supabase/migrations/202609270002_multi_vertical_storefront.sql`
- Modify: `lib/database.types.ts`
- Modify: `lib/validation.ts`
- Modify: `app/actions/dashboard.ts`
- Modify: `components/product-form.tsx`
- Modify: `app/dashboard/products/page.tsx`
- Modify: `lib/storefront-data.ts`
- Modify: public catalog and product-detail RPC payloads in the migration
- Test: `tests/vertical-catalog.test.mjs`
- Test: `supabase/tests/storefront_v2.test.sql`

- [ ] Write tests for fixed, starting-at, and quote price parsing/formatting and for the rules that Retail/Food require fixed prices while Services accept all three modes.
- [ ] Run the focused tests and verify they fail because no vertical pricing contract exists.
- [ ] Add `pricing_mode` constrained to `fixed`, `starting_at`, or `quote`, default existing rows to `fixed`, and permit `price`/`card_price` to be null only when the pricing mode is `quote`.
- [ ] Add the pricing mode to public product payloads and TypeScript/Zod contracts; reject null prices for Retail and Food.
- [ ] Pass the authenticated tenant type from `requireTenant()` into server-side product validation; ignore browser-supplied tenant ids.
- [ ] Render the Services price controls conditionally; keep Retail Pix/card fields and Food's single menu price.
- [ ] Update dashboard list price display to show fixed amount, “A partir de …”, or “Consultar”.
- [ ] Run focused tests, database tests, lint, and typecheck.

### Task 3: Food menu storefront and order flow

**Files:**
- Create: `components/food-storefront.tsx`
- Modify: `components/storefront.tsx`
- Modify: `components/store-cart.tsx`
- Modify: `components/product-detail.tsx`
- Modify: `components/storefront-header.tsx`
- Modify: `app/globals.css`
- Test: `tests/vertical-catalog.test.mjs`

- [ ] Add tests for Food's menu labels and encoded WhatsApp order content, covering product name, quantity, and total.
- [ ] Run those tests and verify the expected Food labels/message are missing.
- [ ] Build a Food storefront with category navigation, compact menu cards, image fallback, fixed price, and add-to-order action.
- [ ] Reuse the current tenant-scoped cart and quantity controls; add Food wording for order/cart/WhatsApp while preserving Retail wording.
- [ ] Make item detail UI use menu terminology and one Food price; retain option selection already supported by the shared cart.
- [ ] Keep every image, link, WhatsApp number, color, logo, and tenant path scoped to the resolved tenant.
- [ ] Run tests, lint, typecheck, and production build.

### Task 4: Services catalog and direct WhatsApp inquiry

**Files:**
- Create: `components/services-storefront.tsx`
- Create: `lib/verticals.ts`
- Modify: `components/storefront.tsx`
- Modify: `components/product-detail.tsx`
- Modify: `components/storefront-header.tsx`
- Modify: `app/globals.css`
- Test: `tests/vertical-catalog.test.mjs`

- [ ] Add tests for Services price labels and WhatsApp messages for fixed, starting-at, and quote modes; include URL encoding for accents and punctuation.
- [ ] Run those tests and confirm they fail before the helper exists.
- [ ] Implement a typed message/link helper and use it from service cards and service details.
- [ ] Render a Services landing hero, service cards, optional service image gallery sourced from active catalog images, and existing contact/about/footer information.
- [ ] Use direct WhatsApp CTAs and omit Retail/Food cart controls from Services pages.
- [ ] Ensure quote-mode services display “Consultar” and their message asks for price details; starting-at messages include the amount.
- [ ] Run tests, lint, typecheck, and production build.

### Task 5: Type-aware dashboard and admin terminology

**Files:**
- Modify: `components/dashboard-nav.tsx`
- Modify: `app/dashboard/layout.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/products/page.tsx`
- Modify: `app/dashboard/products/new/page.tsx`
- Modify: `app/dashboard/products/[id]/page.tsx`
- Modify: `app/dashboard/categories/page.tsx`
- Modify: `components/product-form.tsx`
- Modify: `app/admin/tenants/page.tsx`
- Modify: `app/admin/tenants/[id]/page.tsx`
- Test: `tests/vertical-catalog.test.mjs`

- [ ] Add assertions for dashboard labels: Retail “Produtos”, Food “Cardápio/Itens”, Services “Serviços”.
- [ ] Run focused tests and verify current static Retail labels fail those new cases.
- [ ] Pass the authenticated tenant type to navigation, list, and editor pages; keep route paths and authorization unchanged.
- [ ] Replace user-visible catalog words and page metadata based on tenant type; preserve existing action handlers and tenant-scoped filters.
- [ ] Show selected type on admin tenant list/edit and allow changing it there.
- [ ] Run tests, lint, typecheck, and production build.

### Task 6: Vertical fixtures and isolation verification

**Files:**
- Modify: `supabase/tests/tenant_isolation.test.sql`
- Modify: `supabase/tests/storefront_v2.test.sql`
- Modify: `README.md`

- [ ] Add fixture tenants João Tech (Retail), Burger Test (Food), and Barber Test (Services) inside rollback-only database tests, with categories and representative catalog items.
- [ ] Assert slug/domain lookup returns each vertical, active public products remain scoped to that tenant, and an authenticated owner cannot read or change another tenant's catalog.
- [ ] Run `npx supabase test db` and inspect every TAP assertion.
- [ ] Document how to create the three demonstration tenants from `/admin/tenants/new`; state that custom domains still need Vercel/DNS setup and demo fixtures are not production tenants.
- [ ] Run `npm run lint`, `npx tsc --noEmit`, `npm run test:routes`, `node --test tests/input-formatting.test.mjs tests/vertical-catalog.test.mjs`, and `npm run build`.
- [ ] Review `git diff --check`, inspect the full diff, and re-run failed verifications after fixes.
