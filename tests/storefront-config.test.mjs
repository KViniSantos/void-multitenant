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
    return { name: "Barber Test", storefront_template: "essentials", storefront_config: JSON.stringify(config), whatsapp_number: "" };
  };
  assert.equal(tenantSettingsSchema.safeParse(makeSettings(8)).success, true);
  assert.equal(tenantSettingsSchema.safeParse(makeSettings(9)).success, false);
});
