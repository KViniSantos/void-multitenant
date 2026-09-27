import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicStoreUrl } from "../lib/public-store-url.ts";

test("custom domain takes precedence over the platform origin", () => {
  assert.equal(
    buildPublicStoreUrl(
      { slug: "burger-test", domain: "menu.example.com" },
      "https://void.example/",
    ),
    "https://menu.example.com/",
  );
});

test("slug storefront uses the canonical platform origin", () => {
  assert.equal(
    buildPublicStoreUrl(
      { slug: "burger-test", domain: null },
      "https://void.example/path/",
    ),
    "https://void.example/burger-test",
  );
});

test("invalid slug or base URL is rejected", () => {
  assert.throws(() =>
    buildPublicStoreUrl(
      { slug: "../admin", domain: null },
      "https://void.example",
    ),
  );
  assert.throws(() =>
    buildPublicStoreUrl(
      { slug: "burger-test", domain: null },
      "not a URL",
    ),
  );
  assert.throws(() =>
    buildPublicStoreUrl({ slug: "burger-test", domain: null }, null),
  );
});

test("custom domains must be bare valid hostnames", () => {
  for (const domain of [
    "https://menu.example.com",
    "menu.example.com:443",
    "menu.example.com/path",
    "user@menu.example.com",
    "-menu.example.com",
    "menu..example.com",
    "menu.example-.com",
    "menu.example.com.",
    "localhost",
    "127.0.0.1",
    "menu.123",
    "shop.c",
  ]) {
    assert.throws(() =>
      buildPublicStoreUrl({ slug: "burger-test", domain }, "https://void.example"),
    );
  }
});

test("invalid slugs are rejected even when a custom domain is configured", () => {
  assert.throws(() =>
    buildPublicStoreUrl(
      { slug: "Burger Test", domain: "menu.example.com" },
      "https://void.example",
    ),
  );
});

test("canonical URLs must use HTTP(S) and contain a hostname", () => {
  for (const platformUrl of [
    "ftp://void.example",
    "https://",
    "https://user:password@void.example",
  ]) {
    assert.throws(() =>
      buildPublicStoreUrl({ slug: "burger-test", domain: null }, platformUrl),
    );
  }
});
