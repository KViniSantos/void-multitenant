import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(new URL("../.next/server/app-paths-manifest.json", import.meta.url), "utf8"),
);

test("login has a dedicated route instead of falling through to the store slug route", () => {
  assert.ok(
    manifest["/login/page"],
    "the production build must include /login alongside the dynamic /[slug] storefront route",
  );
});
