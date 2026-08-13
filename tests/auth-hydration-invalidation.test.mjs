import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");

test("initial session restoration does not invalidate during hydration", () => {
  assert.match(source, /onAuthStateChange\(\(event\)\s*=>/);
  assert.match(source, /event === ["']INITIAL_SESSION["']/);
  assert.match(source, /event === ["']TOKEN_REFRESHED["']/);
  assert.match(source, /window\.setTimeout\(\(\) => \{/);
});

test("real auth changes still invalidate route and query state", () => {
  assert.match(source, /void router\.invalidate\(\)/);
  assert.match(source, /void queryClient\.invalidateQueries\(\)/);
});
