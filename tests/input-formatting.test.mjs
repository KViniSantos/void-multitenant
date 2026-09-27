import assert from "node:assert/strict";
import test from "node:test";
import { formatCnpjInput, formatPriceInput, formatWhatsAppPhone, parsePriceInput } from "../lib/input-formatting.ts";

test("Brazilian WhatsApp numbers are formatted with country and area codes", () => {
  assert.equal(formatWhatsAppPhone("85999998888"), "+55 (85) 99999-8888");
  assert.equal(formatWhatsAppPhone("5585999998888"), "+55 (85) 99999-8888");
});

test("price input formats cents and parses Brazilian separators", () => {
  assert.equal(formatPriceInput("123456"), "1.234,56");
  assert.equal(parsePriceInput("1.234,56"), 1234.56);
});

test("CNPJ input receives the standard Brazilian mask", () => {
  assert.equal(formatCnpjInput("12345678000190"), "12.345.678/0001-90");
});
