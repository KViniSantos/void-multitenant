import assert from "node:assert/strict";
import test from "node:test";
import { productSchemaForTenant } from "../lib/validation.ts";

const document = (text) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const product = (richDescription) => ({
  name: "Produto de teste",
  description: "Resumo curto do card",
  price: 25,
  card_price: 25,
  pricing_mode: "fixed",
  category_id: null,
  active: true,
  availability: "in_stock",
  product_condition: "new",
  stock_quantity: null,
  featured: false,
  highlights: [],
  detail_sections: [],
  attributes: [],
  rich_description: richDescription,
});

test("product form validation retains rich document while preserving the short card summary", () => {
  const richDescription = document("Descrição detalhada");
  const result = productSchemaForTenant("retail").safeParse(product(richDescription));

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.description, "Resumo curto do card");
    assert.deepEqual(result.data.rich_description, richDescription);
  }
});

test("product validation rejects unsafe link protocols", () => {
  const unsafe = {
    type: "doc",
    content: [{
      type: "paragraph",
      content: [{ type: "text", text: "abrir", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
    }],
  };

  assert.equal(productSchemaForTenant("retail").safeParse(product(unsafe)).success, false);
});

test("food item rich descriptions stay within the shorter menu limit", () => {
  assert.equal(productSchemaForTenant("food").safeParse(product(document("x".repeat(4_001)))).success, false);
});

test("service details support quote-only products and keep the shared rich-text limit", () => {
  const service = { ...product(document("Agendamento sob consulta")), pricing_mode: "quote", price: null, card_price: null };
  const valid = productSchemaForTenant("services").safeParse(service);
  const invalid = productSchemaForTenant("services").safeParse({ ...service, rich_description: document("x".repeat(10_001)) });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});
