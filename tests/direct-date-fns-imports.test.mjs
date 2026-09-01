import assert from "node:assert/strict";
import { test } from "node:test";

import {
  mapDateFnsModules,
  rewriteDateFnsImports,
} from "../scripts/direct-date-fns-imports.mjs";

const functionModules = mapDateFnsModules(`
export * from "./addDays.js";
export * from "./format.js";
export * from "./startOfWeek.js";
`);

test("maps date-fns root exports to supported function entries", () => {
  assert.deepEqual([...functionModules], [
    ["addDays", "addDays.js"],
    ["format", "format.js"],
    ["startOfWeek", "startOfWeek.js"],
  ]);
});

test("rewrites named date-fns functions while retaining type-only imports", () => {
  const source = `
import {
  addDays,
  format as formatDate,
  type Locale,
} from "date-fns";
`;
  const result = rewriteDateFnsImports(source, functionModules);

  assert.equal(result.rewrittenFunctions, 2);
  assert.match(result.code, /import \{ type Locale \} from "date-fns";/);
  assert.match(result.code, /import \{ addDays \} from "date-fns\/addDays";/);
  assert.match(
    result.code,
    /import \{ format as formatDate \} from "date-fns\/format";/,
  );
});

test("never spans an earlier non-date-fns named import", () => {
  const source = `
import {
  unrelatedValue,
} from "other-package";
import { format } from "date-fns";
`;
  const result = rewriteDateFnsImports(source, functionModules);

  assert.equal(result.rewrittenFunctions, 1);
  assert.match(result.code, /unrelatedValue,[\s\S]*?from "other-package";/);
  assert.doesNotMatch(result.code, /unrelatedValue \} from "date-fns\//);
});

test("fails closed for a runtime export without a direct entry", () => {
  assert.throws(
    () => rewriteDateFnsImports('import { unknown } from "date-fns";', functionModules),
    /runtime export unknown is not a direct function module/,
  );
});
