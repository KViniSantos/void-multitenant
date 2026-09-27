import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFoodOrderMessage,
  foodOrderWhatsAppHref,
  buildServiceInquiryMessage,
  formatCatalogPrice,
  getVerticalLabels,
  serviceWhatsAppHref,
} from "../lib/verticals.ts";
import { productSchemaForTenant, tenantCreateSchema } from "../lib/validation.ts";

test("catalog labels follow the tenant vertical", () => {
  assert.equal(getVerticalLabels("retail").items, "Produtos");
  assert.equal(getVerticalLabels("food").items, "Cardápio");
  assert.equal(getVerticalLabels("services").items, "Serviços");
});

test("existing tenant creation defaults to Retail and rejects unknown verticals", () => {
  const tenant = {
    name: "Loja de teste",
    slug: "loja-teste",
    owner_email: "owner@example.test",
    domain: "",
    whatsapp_number: "",
  };
  assert.equal(tenantCreateSchema.parse(tenant).tenant_type, "retail");
  assert.equal(tenantCreateSchema.safeParse({ ...tenant, tenant_type: "salon" }).success, false);
});

test("services may use fixed, starting-at, and quote pricing while other verticals require fixed prices", () => {
  const product = {
    name: "Corte masculino",
    description: "Corte tradicional",
    price: 35,
    card_price: null,
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
  };

  assert.equal(productSchemaForTenant("services").safeParse(product).success, true);
  assert.equal(productSchemaForTenant("services").safeParse({ ...product, pricing_mode: "starting_at", price: 250 }).success, true);
  assert.equal(productSchemaForTenant("services").safeParse({ ...product, pricing_mode: "quote", price: null }).success, true);
  assert.equal(productSchemaForTenant("retail").safeParse({ ...product, price: 35, card_price: 40 }).success, true);
  assert.equal(productSchemaForTenant("food").safeParse({ ...product, price: 28, card_price: 28 }).success, true);
  assert.equal(productSchemaForTenant("food").safeParse({ ...product, pricing_mode: "quote", price: null }).success, false);
  assert.match(formatCatalogPrice("starting_at", 250), /A partir de.*250,00/i);
  assert.equal(formatCatalogPrice("quote", null), "Consultar");
});

test("food order message includes each item, quantity, and order total", () => {
  const message = buildFoodOrderMessage("Burger Test", [
    { name: "X-Bacon", quantity: 2, subtotal: 50, options: { Ponto: "Bem passado", Adicional: "Bacon extra" } },
    { name: "Coca-Cola", quantity: 1, subtotal: 7 },
  ], 57);

  assert.match(message, /Burger Test/);
  assert.match(message, /X-Bacon/);
  assert.match(message, /Quantidade: 2/);
  assert.match(message, /Ponto: Bem passado/);
  assert.match(message, /Coca-Cola/);
  assert.match(message, /Total:.*57,00/);
  const href = foodOrderWhatsAppHref("+55 (11) 99999-9999", "Burger Test", [{ name: "X-Bacon", quantity: 1, subtotal: 25 }], 25);
  assert.equal(new URL(href).hostname, "wa.me");
  assert.match(new URL(href).searchParams.get("text"), /X-Bacon/);
});

test("service inquiry text reflects fixed, starting-at, and quote prices", () => {
  assert.match(buildServiceInquiryMessage("Corte + Barba", "fixed", 55), /no valor de.*55,00/);
  assert.match(buildServiceInquiryMessage("Instalação", "starting_at", 250), /a partir de.*250,00/i);
  assert.match(buildServiceInquiryMessage("Manutenção elétrica", "quote", null), /saber mais informações e o valor/);
});

test("service WhatsApp link safely encodes Portuguese service names", () => {
  const href = serviceWhatsAppHref("5511999999999", "Manutenção elétrica", "quote", null);
  const url = new URL(href);

  assert.equal(url.hostname, "wa.me");
  assert.match(url.searchParams.get("text"), /Manutenção elétrica/);
  assert.match(url.searchParams.get("text"), /saber mais informações e o valor/);
});
