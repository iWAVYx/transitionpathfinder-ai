import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/pwa/query-persistence.ts", import.meta.url), "utf8");

test("query persistence invalidates the permissive v1 cache", () => {
  assert.match(source, /const CACHE_KEY = ["']tf-query-cache-v2["']/);
  assert.match(source, /LEGACY_CACHE_KEYS = \[["']tf-query-cache-v1["']\]/);
  assert.match(source, /localStorage\.removeItem\(key\)/);
});

test("query persistence is private by default", () => {
  assert.match(source, /query\.state\.status === ["']success["']/);
  assert.match(source, /query\.meta\?\.persist === true/);
  assert.doesNotMatch(source, /query\.queryKey\.some/);
});
