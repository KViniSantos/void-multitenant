import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(new URL("../.next/server/app-paths-manifest.json", import.meta.url), "utf8"),
);

test("tenant storefront has a shareable product-detail route", () => {
  assert.ok(
    manifest["/[slug]/produto/[productSlug]/page"],
    "the production build must include /{tenant}/produto/{product}",
  );
});

test("custom-domain storefront has a shareable product-detail route", () => {
  assert.ok(
    manifest["/produto/[productSlug]/page"],
    "the production build must include /produto/{product} for a custom domain",
  );
});

test("Food QR tool has a dedicated dashboard route", () => {
  assert.ok(manifest["/dashboard/qr-code/page"], "the production build must include /dashboard/qr-code");
});
