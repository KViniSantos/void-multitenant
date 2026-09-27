import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStorefrontConfig, storefrontConfigSchema } from "../lib/storefront-config.ts";
import { tenantCreateSchema, tenantSettingsSchema } from "../lib/validation.ts";

const designDefaults = {
  banner_variant: "split",
  card_variant: "image-top",
  category_variant: "chips",
  header_variant: "standard",
  footer_variant: "columns",
};

test("legacy tenant configuration receives design defaults without losing content", () => {
  const config = normalizeStorefrontConfig({
    hero: { title: "Novidades da loja" },
    sections: { about: { title: "Nossa história", text: "Desde 2010" } },
  });

  assert.deepEqual(config.design, designDefaults);
  assert.equal(config.hero.title, "Novidades da loja");
  assert.equal(config.sections.about.text, "Desde 2010");
});

test("design settings accept only the prebuilt variant identifiers", () => {
  const invalid = storefrontConfigSchema.safeParse({
    design: { ...designDefaults, card_variant: "custom-html" },
  });

  assert.equal(invalid.success, false);
});

test("tenant settings validate colors used by the live design preview", () => {
  const validSettings = {
    name: "Loja Teste",
    storefront_template: "essentials",
    storefront_config: JSON.stringify({}),
    whatsapp_number: "5585999999999",
    primary_color: "#123456",
    secondary_color: "#ABCDEF",
  };
  const valid = tenantSettingsSchema.safeParse(validSettings);
  const invalid = tenantSettingsSchema.safeParse({ ...validSettings, primary_color: "purple" });

  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.primary_color, "#123456");
  assert.equal(invalid.success, false);
});

test("institutional rich text is retained in tenant settings", () => {
  const richText = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Atendimento cuidadoso" }] }],
  };
  const config = normalizeStorefrontConfig({ sections: { about: { rich_text: richText } } });

  assert.deepEqual(config.sections.about.rich_text, richText);
});

test("the private preview route is reserved from tenant slugs", () => {
  const result = tenantCreateSchema.safeParse({
    name: "Loja de teste",
    slug: "store-preview",
    owner_email: "owner@example.com",
    domain: "",
    whatsapp_number: "5585999999999",
    tenant_type: "retail",
    storefront_template: "essentials",
  });

  assert.equal(result.success, false);
});
