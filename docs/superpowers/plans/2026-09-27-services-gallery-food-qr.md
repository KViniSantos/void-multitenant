# Services Gallery and Food QR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated, configurable Services photo gallery and a Food-only dashboard page that creates downloadable QR codes for the public storefront.

**Architecture:** Keep gallery metadata in `tenants.storefront_config`, reuse the tenant-prefixed `store-assets` bucket, and validate gallery URLs on the server. Build Food URLs from a custom domain or the configured platform origin, generate QR PNGs locally in the dashboard, and enforce Food-only access on the server.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Supabase Storage, `qrcode`, Node test runner, Supabase pgTAP.

---

## File map

- Create `lib/storefront-config.ts` for shared config validation, backward-compatible defaults, and gallery visibility rules.
- Modify `lib/database.types.ts`, `lib/storefront-data.ts`, and `lib/validation.ts` to use the new config fields without breaking saved tenant settings.
- Create `lib/tenant-assets.ts` for pure tenant asset URL/path validation and gallery cleanup path selection; use it from `lib/assets.ts` and `app/actions/dashboard.ts`.
- Modify `lib/browser-assets.ts`, `components/settings-form.tsx`, and `app/actions/dashboard.ts` to upload, configure, validate, and clean up gallery images.
- Modify `components/storefront.tsx`, `components/storefront-header.tsx`, and `app/storefront-overrides.css` to render the Services gallery and its optional navigation link responsively.
- Create `lib/public-store-url.ts`, `lib/qr-code.ts`, `components/food-store-qr.tsx`, and `app/dashboard/qr-code/page.tsx`; modify `components/dashboard-nav.tsx` to link the QR tool only for Food tenants; add responsive styles in `app/globals.css`.
- Add focused Node tests in `tests/storefront-config.test.mjs`, `tests/tenant-assets.test.mjs`, and `tests/public-store-url.test.mjs`; extend `tests/storefront-routes.test.mjs` for the dashboard route.
- Modify `package.json` and `package-lock.json` for `qrcode` and its TypeScript definitions. No environment variable or Supabase migration is planned.

## Task 1: Normalize storefront config and retain legacy settings

**Files:**
- Create: `lib/storefront-config.ts`
- Modify: `lib/database.types.ts`
- Modify: `lib/storefront-data.ts`
- Modify: `lib/validation.ts`
- Modify: `components/settings-form.tsx`
- Test: `tests/storefront-config.test.mjs`

- [ ] **Step 1: Read the installed Next.js guides before source edits**

Read the installed Next.js 16.3.6 guides required by `AGENTS.md` before proceeding with any source or test code. Run `rtk proxy powershell -NoProfile -Command "Get-Content 'node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md'; Get-Content 'node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md'; Get-Content 'node_modules/next/dist/docs/01-app/01-getting-started/12-images.md'"` and confirm the App Router page, Server/Client Component, and image guidance.

- [ ] **Step 2: Write a failing test for old and new storefront config**

Create `tests/storefront-config.test.mjs` with the following test. The old config deliberately lacks the new gallery and navigation properties but includes an existing custom hero value that must survive normalization.

```js
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_STOREFRONT_CONFIG } from "../lib/database.types.ts";
import { normalizeStorefrontConfig, shouldShowGallery } from "../lib/storefront-config.ts";
import { tenantSettingsSchema } from "../lib/validation.ts";

test("legacy config keeps saved values and receives gallery defaults", () => {
  const legacy = structuredClone(DEFAULT_STOREFRONT_CONFIG);
  delete legacy.navigation.show_gallery_link;
  delete legacy.sections.gallery;
  legacy.section_order = legacy.section_order.filter((key) => key !== "gallery");
  legacy.hero.title = "Banner antigo";

  const result = normalizeStorefrontConfig(legacy);

  assert.equal(result.hero.title, "Banner antigo");
  assert.equal(result.sections.gallery.enabled, false);
  assert.deepEqual(result.sections.gallery.image_urls, []);
  assert.equal(result.navigation.show_gallery_link, true);
  assert.deepEqual(result.section_order, ["categories", "featured", "catalog", "about", "contact", "gallery"]);
});

test("gallery visibility requires an enabled populated Services gallery", () => {
  const gallery = { enabled: true, title: "Nossa equipe", image_urls: ["https://assets.example/photo.jpg"] };
  assert.equal(shouldShowGallery("services", gallery), true);
  assert.equal(shouldShowGallery("food", gallery), false);
  assert.equal(shouldShowGallery("services", { ...gallery, enabled: false }), false);
  assert.equal(shouldShowGallery("services", { ...gallery, image_urls: [] }), false);
});

test("settings accept at most eight gallery images", () => {
  const makeSettings = (count) => {
    const config = structuredClone(DEFAULT_STOREFRONT_CONFIG);
    config.sections.gallery.image_urls = Array.from({ length: count }, (_, index) => `https://assets.example/${index}.webp`);
    return {
      name: "Barber Test",
      storefront_template: "essentials",
      storefront_config: JSON.stringify(config),
      whatsapp_number: "",
    };
  };
  assert.equal(tenantSettingsSchema.safeParse(makeSettings(8)).success, true);
  assert.equal(tenantSettingsSchema.safeParse(makeSettings(9)).success, false);
});
```

- [ ] **Step 3: Run the test and confirm the missing implementation fails**

Run: `rtk node --test tests/storefront-config.test.mjs`

Expected before implementation: module resolution fails because `lib/storefront-config.ts` does not exist.

- [ ] **Step 4: Add config fields and a shared normalizer**

Add `show_gallery_link` to `StorefrontConfig.navigation`; add `sections.gallery` as `{ enabled: boolean; title: string; image_urls: string[] }`; add `gallery` to `StorefrontSectionKey`; and add defaults (`show_gallery_link: true`, disabled gallery, title `Galeria`, empty image list, and `gallery` as the last default section).

In `lib/storefront-config.ts`, define one Zod schema for the storefront config and export `normalizeStorefrontConfig(value: unknown): StorefrontConfig` and `shouldShowGallery(tenantType, gallery)`. The normalizer must merge each nested config group with defaults, accept the five-key section order already saved by older tenants, append any missing section keys once, and return the default config only when the existing values are invalid. The gallery predicate must return true only for `tenantType === "services"`, `gallery.enabled`, and a nonempty image list.

Import the shared normalizer in `lib/storefront-data.ts` and replace its local duplicate parser. Replace the shallow config merge in `components/settings-form.tsx` with `normalizeStorefrontConfig(tenant.storefront_config)`. Make `tenantSettingsSchema` validate the normalized new shape while continuing to accept old saved data.

```ts
export function shouldShowGallery(
  tenantType: TenantType,
  gallery: StorefrontConfig["sections"]["gallery"],
) {
  return tenantType === "services" && gallery.enabled && gallery.image_urls.length > 0;
}
```

- [ ] **Step 5: Run the config test and app type checker**

Run: `rtk node --test tests/storefront-config.test.mjs`

Expected: all three tests pass.

Run: `rtk npx tsc --noEmit`

Expected: exit code 0.

## Task 2: Validate gallery assets and implement settings upload/removal

**Files:**
- Create: `lib/tenant-assets.ts`
- Modify: `lib/assets.ts`
- Modify: `lib/browser-assets.ts`
- Modify: `lib/validation.ts`
- Modify: `app/actions/dashboard.ts`
- Modify: `components/settings-form.tsx`
- Test: `tests/tenant-assets.test.mjs`

- [ ] **Step 1: Write failing asset ownership and cleanup tests**

Create `tests/tenant-assets.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { getTenantAssetPath, getRemovedGalleryPaths } from "../lib/tenant-assets.ts";

const tenantId = "20000000-0000-0000-0000-000000000004";
const otherTenantId = "20000000-0000-0000-0000-000000000003";
const origin = "https://project.supabase.co";
const asset = (id, folder = "gallery", tenant = tenantId) =>
  `${origin}/storage/v1/object/public/store-assets/${tenant}/${folder}/${id}.webp`;

test("tenant asset validation accepts only this tenant's gallery path", () => {
  assert.equal(getTenantAssetPath(asset("11111111-1111-4111-8111-111111111111"), tenantId, "gallery", origin), `${tenantId}/gallery/11111111-1111-4111-8111-111111111111.webp`);
  assert.equal(getTenantAssetPath(asset("22222222-2222-4222-8222-222222222222", "gallery", otherTenantId), tenantId, "gallery", origin), null);
  assert.equal(getTenantAssetPath("https://images.example/photo.webp", tenantId, "gallery", origin), null);
  assert.equal(getTenantAssetPath(`${asset("33333333-3333-4333-8333-333333333333")}?download=1`, tenantId, "gallery", origin), null);
});

test("removed gallery assets exclude retained URLs and never include other folders", () => {
  assert.deepEqual(
    getRemovedGalleryPaths([asset("11111111-1111-4111-8111-111111111111"), asset("22222222-2222-4222-8222-222222222222")], [asset("22222222-2222-4222-8222-222222222222")], tenantId, origin),
    [`${tenantId}/gallery/11111111-1111-4111-8111-111111111111.webp`],
  );
  assert.deepEqual(getRemovedGalleryPaths([asset("44444444-4444-4444-8444-444444444444", "about")], [], tenantId, origin), []);
});
```

- [ ] **Step 2: Run tests and confirm helper is missing**

Run: `rtk node --test tests/tenant-assets.test.mjs`

Expected before implementation: module resolution fails because `lib/tenant-assets.ts` does not exist.

- [ ] **Step 3: Implement a pure path validator and gallery cleanup selector**

Implement `getTenantAssetPath(url, tenantId, folder, supabaseOrigin)` to return a Storage object path only when the URL uses the configured Supabase origin, `store-assets`, the exact tenant UUID and requested folder, has exactly one filename segment, and has no query or fragment. Accept only the existing image extensions. Implement `getRemovedGalleryPaths(previousUrls, nextUrls, tenantId, supabaseOrigin)` by selecting unique safe gallery paths whose original URLs are no longer retained. Use the pure helper from the existing server-only asset module so product/logo/banner/about checks keep their current behavior.

```ts
export function getRemovedGalleryPaths(previousUrls: string[], nextUrls: string[], tenantId: string, supabaseOrigin: string) {
  const retained = new Set(nextUrls);
  return [...new Set(previousUrls.filter((url) => !retained.has(url))
    .map((url) => getTenantAssetPath(url, tenantId, "gallery", supabaseOrigin))
    .filter((path): path is string => path !== null))];
}
```

- [ ] **Step 4: Validate limits and URLs in the server action**

Add a maximum of eight gallery image URLs in `tenantSettingsSchema`; verify every URL with `isTenantAssetUrl(url, tenant.id, "gallery")` in `saveSettingsAction`. Normalize the existing tenant config before reading its prior gallery. After the tenant update succeeds, remove only safe stale gallery object paths through `supabase.storage.from("store-assets").remove(paths)`. Keep the database save successful if Storage cleanup itself fails, and do not attempt cleanup before the database update succeeds.

- [ ] **Step 5: Extend the uploader and settings form**

Add `gallery` to the asset folder type in `lib/browser-assets.ts`. In `components/settings-form.tsx`, show gallery controls only when `tenant.tenant_type === "services"`: enabled toggle, title, ordered current thumbnails with remove/up/down controls, and a multi-file selector. Limit selected files to the remaining slots out of eight and use the existing JPG/PNG/WebP/AVIF signature and 5 MB checks. Upload to `{tenantId}/gallery/`, append returned URLs in selection order, include uploads in the existing failed-save cleanup list, and serialize the updated config before calling `saveSettingsAction`.

```tsx
{tenant.tenant_type === "services" ? (
  <label className="field file-field">
    <span>Fotos da galeria</span>
    <input name="gallery_images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple />
    <small>Até 8 imagens no total, com até 5 MB cada.</small>
  </label>
) : null}
```

- [ ] **Step 6: Verify asset tests, config tests, and TypeScript**

Run: `rtk node --test tests/tenant-assets.test.mjs tests/storefront-config.test.mjs`

Expected: all tests pass, including rejection of another tenant's URL and safe removed-path selection.

Run: `rtk npx tsc --noEmit`

Expected: exit code 0.

## Task 3: Render the responsive Services gallery

**Files:**
- Modify: `components/storefront.tsx`
- Modify: `components/storefront-header.tsx`
- Modify: `app/storefront-overrides.css`

- [ ] **Step 1: Add the gallery section renderer**

Add a `gallery` branch to `SectionContent`. Use `shouldShowGallery` to prevent rendering for non-Services tenants, disabled galleries, or empty lists. Render the configured title and images using `next/image`, stable keys, descriptive alt text, `sizes`, and a lazy-loaded responsive grid. Do not render empty placeholders.

```tsx
if (id === "gallery") {
  const gallery = config.sections.gallery;
  if (!shouldShowGallery(store.tenant_type, gallery)) return null;
  return <section className="sf-section sf-gallery-section" id="galeria">
    <div className="sf-section-heading"><h2>{gallery.title}</h2></div>
    <div className="sf-gallery-grid">
      {gallery.image_urls.map((url, index) => <div className="sf-gallery-image" key={url}>
        <Image src={url} alt={`${store.name}, foto ${index + 1}`} fill sizes="(max-width: 680px) 50vw, (max-width: 1000px) 33vw, 25vw" />
      </div>)}
    </div>
  </section>;
}
```

- [ ] **Step 2: Add the optional Services navigation link**

In `components/storefront-header.tsx`, include a `Galeria` anchor at `#galeria` only when the tenant is Services, `show_gallery_link` is true, and the gallery is enabled and populated. Keep existing links and the WhatsApp CTA unchanged.

- [ ] **Step 3: Add desktop and mobile gallery styles**

In `app/storefront-overrides.css`, style `.sf-gallery-grid` as a four-column responsive CSS grid with a 4:3 image frame, `object-fit: cover`, and the current store radius/color tokens. At `max-width: 1000px`, use three columns; at `max-width: 680px`, use two columns and reduce section gaps. Do not add a client-side gallery package or carousel.

- [ ] **Step 4: Run lint and TypeScript**

Run: `rtk npm run lint`

Expected: exit code 0.

Run: `rtk npx tsc --noEmit`

Expected: exit code 0.

## Task 4: Build and test canonical public storefront URLs

**Files:**
- Create: `lib/public-store-url.ts`
- Test: `tests/public-store-url.test.mjs`

- [ ] **Step 1: Write failing URL resolution tests**

Create `tests/public-store-url.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicStoreUrl } from "../lib/public-store-url.ts";

test("custom domain takes precedence over the platform origin", () => {
  assert.equal(buildPublicStoreUrl({ slug: "burger-test", domain: "menu.example.com" }, "https://void.example/"), "https://menu.example.com/");
});

test("slug storefront uses the canonical platform origin", () => {
  assert.equal(buildPublicStoreUrl({ slug: "burger-test", domain: null }, "https://void.example/path/"), "https://void.example/burger-test");
});

test("invalid slug or base URL is rejected", () => {
  assert.throws(() => buildPublicStoreUrl({ slug: "../admin", domain: null }, "https://void.example"));
  assert.throws(() => buildPublicStoreUrl({ slug: "burger-test", domain: null }, "not a URL"));
  assert.throws(() => buildPublicStoreUrl({ slug: "burger-test", domain: null }, null));
});
```

- [ ] **Step 2: Confirm the tests fail**

Run: `rtk node --test tests/public-store-url.test.mjs`

Expected before implementation: module resolution fails because `lib/public-store-url.ts` does not exist.

- [ ] **Step 3: Implement deterministic URL resolution**

Export `buildPublicStoreUrl({ slug, domain }, platformUrl)` from a pure module. Validate slugs against `^[a-z0-9]+(?:-[a-z0-9]+)*$`. When a domain is present, validate it as a hostname and return `https://{domain}/`; otherwise require a valid canonical URL, accept only HTTP or HTTPS, use its origin, and append `/{slug}`. The caller supplies `process.env.NEXT_PUBLIC_SITE_URL` or the local development origin; no new env var is introduced. Reject a missing canonical URL instead of generating a QR that points at localhost in production.

- [ ] **Step 4: Run URL tests**

Run: `rtk node --test tests/public-store-url.test.mjs`

Expected: all three URL tests pass.

## Task 5: Generate and download QR PNGs locally

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/qr-code.ts`
- Create: `components/food-store-qr.tsx`
- Modify: `app/globals.css`
- Test: `tests/public-store-url.test.mjs`

- [ ] **Step 1: Install the QR library and its types**

Run: `rtk npm install qrcode`

Expected: `qrcode` is added to dependencies and the lockfile is updated.

Run: `rtk npm install --save-dev @types/qrcode`

Expected: TypeScript declarations are added to dev dependencies and the lockfile is updated.

- [ ] **Step 2: Add a failing test for the app QR helper**

Append this test to `tests/public-store-url.test.mjs`:

```js
import { generateStoreQrDataUrl } from "../lib/qr-code.ts";

test("app QR helper generates a PNG data URL for a public Food store", async () => {
  const dataUrl = await generateStoreQrDataUrl("https://void.example/burger-test");
  assert.match(dataUrl, /^data:image\/png;base64,/);
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
```

- [ ] **Step 3: Run the QR test and confirm the app helper is missing**

Run: `rtk node --test tests/public-store-url.test.mjs`

Expected before implementation: module resolution fails because `lib/qr-code.ts` does not exist.

- [ ] **Step 4: Implement the app QR helper and rerun the test**

Create `lib/qr-code.ts`, import `QRCode` from `qrcode`, and export `generateStoreQrDataUrl(url)` that returns `QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 320 })`.

Run: `rtk node --test tests/public-store-url.test.mjs`

Expected: all URL tests and the PNG signature test pass.

- [ ] **Step 5: Implement a lazy browser QR component**

Create a client component that imports the QR helper inside `useEffect`, calls it only for a nonempty `url`, and renders the PNG preview. Accept `url: string | null` and an `initialError` prop. If URL construction failed on the server, show an actionable configuration message while keeping the rest of the dashboard usable. Add an explicit cleanup flag so an outdated promise cannot update state after unmount. Render the public URL, usage instructions, copy button, and a PNG download anchor named `{slug}-qr-code.png`. Show generation and clipboard errors inline; keep QR generation local with no API request.

```tsx
const [image, setImage] = useState("");
useEffect(() => {
  let active = true;
  if (!url) return;
  import("@/lib/qr-code").then(({ generateStoreQrDataUrl }) => generateStoreQrDataUrl(url))
    .then((dataUrl) => { if (active) setImage(dataUrl); })
    .catch(() => { if (active) setError("Não foi possível gerar o QR. Recarregue a página e tente novamente."); });
  return () => { active = false; };
}, [url]);
```

In the component, render an accessible QR image with alt text that says it opens the store, a selectable public URL, a copy button, an inline copy/generation status, and a download anchor only after the PNG exists. Use classes `food-qr-panel`, `food-qr-image`, and `food-qr-actions`.

- [ ] **Step 6: Add responsive QR dashboard styles**

In `app/globals.css`, style the QR panel as a two-column desktop card with the QR centered in a white square; collapse to one column below 700 px. Constrain the rendered QR to `min(100%, 320px)`, wrap long URLs, and allow the copy/download buttons to stack on narrow screens.

- [ ] **Step 7: Run unit tests and TypeScript**

Run: `rtk node --test tests/public-store-url.test.mjs`

Expected: all URL and QR PNG tests pass.

Run: `rtk npx tsc --noEmit`

Expected: exit code 0.

## Task 6: Add the Food-only dashboard route and navigation

**Files:**
- Create: `app/dashboard/qr-code/page.tsx`
- Modify: `components/dashboard-nav.tsx`
- Modify: `tests/storefront-routes.test.mjs`

- [ ] **Step 1: Extend the route-manifest test**

Append to `tests/storefront-routes.test.mjs`:

```js
test("Food QR tool has a dedicated dashboard route", () => {
  assert.ok(manifest["/dashboard/qr-code/page"], "the production build must include /dashboard/qr-code");
});
```

- [ ] **Step 2: Confirm the new route test fails before implementation**

Run: `rtk npm run build`

Expected: the current application builds and refreshes the route manifest without `/dashboard/qr-code/page`.

Run: `rtk node --test tests/storefront-routes.test.mjs`

Expected: only the new Food QR route assertion fails because the route is not present.

- [ ] **Step 3: Add the server route and Food guard**

Create the page as a Server Component. Call `requireTenant()`, call `notFound()` unless `tenant.tenant_type === "food"`, and build the URL with `buildPublicStoreUrl({ slug: tenant.slug, domain: tenant.domain }, process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3000" : null))`. Catch URL construction errors, pass `url={null}` and a message that asks the platform administrator to configure the canonical site URL or connect a valid custom domain, and render `FoodStoreQR` with the slug. Use the existing dashboard content and heading classes.

```tsx
const { tenant } = await requireTenant();
if (tenant.tenant_type !== "food") notFound();
let publicUrl: string | null = null;
let initialError: string | null = null;
try {
  publicUrl = buildPublicStoreUrl(
    { slug: tenant.slug, domain: tenant.domain },
    process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3000" : null),
  );
} catch {
  initialError = "O QR está indisponível. Peça ao administrador para configurar o endereço público ou conectar o domínio da loja.";
}
return <main className="dashboard-content"><FoodStoreQR url={publicUrl} slug={tenant.slug} initialError={initialError} /></main>;
```

- [ ] **Step 4: Show the dashboard link only to Food tenants**

In `components/dashboard-nav.tsx`, add `/dashboard/qr-code` only when `tenantType === "food"`. Use the existing sidebar-link styles and do not change Retail or Services navigation.

- [ ] **Step 5: Verify the route build and manifest**

Run: `rtk npm run build`

Expected: build succeeds and generates `.next/server/app-paths-manifest.json`.

Run: `rtk node --test tests/storefront-routes.test.mjs`

Expected: slug product detail, custom-domain product detail, and Food QR route tests pass.

## Task 7: Run the complete regression and production checks

**Files:**
- No further source files unless a check reveals a defect.

- [ ] **Step 1: Run all application tests against the built route manifest**

Run: `rtk node --test`

Expected: all Node tests pass, including config compatibility, asset ownership, public URL resolution, QR PNG creation, and route manifests.

- [ ] **Step 2: Run Supabase rollback-only tests**

Run: `rtk npx supabase test db`

Expected: `tenant_isolation.test.sql` and `storefront_v2.test.sql` pass; fixture inserts roll back. Use the configured local Supabase Docker stack; do not seed production tenants or catalog rows.

- [ ] **Step 3: Run lint, types, and production build**

Run: `rtk npm run lint`

Expected: exit code 0.

Run: `rtk npx tsc --noEmit`

Expected: exit code 0.

Run: `rtk npm run build`

Expected: exit code 0 and the manifest tests still pass.

- [ ] **Step 4: Review the final diff and deployment state**

Stage only the approved feature files, tests, package files, and this plan with `rtk git add app/actions/dashboard.ts app/dashboard/qr-code/page.tsx app/globals.css app/storefront-overrides.css components/dashboard-nav.tsx components/food-store-qr.tsx components/settings-form.tsx components/storefront-header.tsx components/storefront.tsx lib/assets.ts lib/browser-assets.ts lib/database.types.ts lib/public-store-url.ts lib/qr-code.ts lib/storefront-config.ts lib/storefront-data.ts lib/tenant-assets.ts lib/validation.ts package.json package-lock.json tests/public-store-url.test.mjs tests/storefront-config.test.mjs tests/storefront-routes.test.mjs tests/tenant-assets.test.mjs docs/superpowers/plans/2026-09-27-services-gallery-food-qr.md`.

Run `rtk git diff --cached --check` and `rtk git diff --cached --stat`; confirm there is no Supabase migration, generated fixture, secret, or unrelated change. Commit with `rtk git commit -m "feat: add services gallery and food QR"`, then push with `rtk git push origin main` to the already configured GitHub remote. Verify the connected Vercel production deployment reports success and run `rtk curl.exe -I https://void-multitenant.vercel.app` to confirm the application alias responds with HTTP 200.

Expected: only the approved gallery/QR source, tests, and dependency-lock changes are published, and Vercel reports the pushed commit as deployed.
