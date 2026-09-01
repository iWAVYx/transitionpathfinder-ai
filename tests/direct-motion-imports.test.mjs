import assert from "node:assert/strict";
import { test } from "node:test";

import { rewriteMotionReactImports } from "../scripts/direct-motion-imports.mjs";

const directExports = new Map([
  [
    "motion",
    { moduleId: "transitionforward:motion-direct/motion", exportName: "m" },
  ],
  [
    "useScroll",
    { moduleId: "transitionforward:motion-direct/useScroll", exportName: "useScroll" },
  ],
  [
    "useReducedMotion",
    {
      moduleId: "transitionforward:motion-direct/useReducedMotion",
      exportName: "useReducedMotion",
    },
  ],
]);

test("rewrites Motion runtime exports while preserving aliases and types", () => {
  const source = `
import {
  motion,
  useScroll as usePageScroll,
  type MotionProps,
} from "motion/react";
`;
  const result = rewriteMotionReactImports(source, directExports);

  assert.equal(result.rewrittenExports, 2);
  assert.match(result.code, /import \{ type MotionProps \} from "motion\/react";/);
  assert.match(
    result.code,
    /import \{ m as motion \} from "transitionforward:motion-direct\/motion";/,
  );
  assert.match(
    result.code,
    /import \{ useScroll as usePageScroll \} from "transitionforward:motion-direct\/useScroll";/,
  );
});

test("retains whole type-only Motion imports", () => {
  const source = 'import type { MotionProps } from "motion/react";';
  const result = rewriteMotionReactImports(source, directExports);

  assert.equal(result.rewrittenExports, 0);
  assert.equal(result.code, source);
});

test("fails closed for an unreviewed Motion runtime export", () => {
  assert.throws(
    () => rewriteMotionReactImports('import { animate } from "motion/react";', directExports),
    /has no reviewed direct module/,
  );
});

test("never spans an earlier non-Motion named import", () => {
  const source = `
import { something } from "somewhere";
import { useReducedMotion } from "motion/react";
`;
  const result = rewriteMotionReactImports(source, directExports);

  assert.match(result.code, /import \{ something \} from "somewhere";/);
  assert.match(
    result.code,
    /import \{ useReducedMotion \} from "transitionforward:motion-direct\/useReducedMotion";/,
  );
});
