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
  assert.equal(getTenantAssetPath(asset("44444444-4444-4444-8444-444444444444").replace(".webp", ".svg"), tenantId, "gallery", origin), null);
  assert.equal(getTenantAssetPath(asset("55555555-5555-4555-8555-555555555555").replace("store-assets", "other-bucket"), tenantId, "gallery", origin), null);
  assert.equal(getTenantAssetPath(`${asset("66666666-6666-4666-8666-666666666666")}/extra.webp`, tenantId, "gallery", origin), null);
  assert.equal(getTenantAssetPath(`https://other.supabase.co${new URL(asset("77777777-7777-4777-8777-777777777777")).pathname}`, tenantId, "gallery", origin), null);
  assert.equal(getTenantAssetPath(asset("88888888-8888-4888-8888-888888888888"), "not-a-uuid", "gallery", origin), null);
  assert.equal(getTenantAssetPath(asset("99999999-9999-4999-8999-999999999999"), tenantId, "unexpected", origin), null);
});

test("removed gallery assets exclude retained URLs and never include other folders", () => {
  assert.deepEqual(
    getRemovedGalleryPaths([asset("11111111-1111-4111-8111-111111111111"), asset("11111111-1111-4111-8111-111111111111"), asset("22222222-2222-4222-8222-222222222222")], [asset("22222222-2222-4222-8222-222222222222")], tenantId, origin),
    [`${tenantId}/gallery/11111111-1111-4111-8111-111111111111.webp`],
  );
  assert.deepEqual(getRemovedGalleryPaths([asset("44444444-4444-4444-8444-444444444444", "about")], [], tenantId, origin), []);
});
