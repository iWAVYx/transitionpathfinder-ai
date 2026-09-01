import assert from "node:assert/strict";
import { test } from "node:test";

import {
  collectLucideRuntimeExports,
  createLucideIconBundle,
  mapLucideIconModules,
  rewriteLucideReactImports,
  rewriteLucideReactImportsFromBundle,
} from "../scripts/direct-lucide-icon-imports.mjs";

const iconModules = mapLucideIconModules(`
export { default as ArrowRight, default as ArrowRightIcon } from './icons/arrow-right.js';
export { default as Settings, default as SettingsIcon } from './icons/settings.js';
`);

test("maps every Lucide alias to its direct ESM icon module", () => {
  assert.deepEqual([...iconModules], [
    ["ArrowRight", "arrow-right.js"],
    ["ArrowRightIcon", "arrow-right.js"],
    ["Settings", "settings.js"],
    ["SettingsIcon", "settings.js"],
  ]);
});

test("rewrites named runtime icons while retaining type-only imports", () => {
  const source = `
import { useState } from "react";
import {
  ArrowRight,
  Settings as SettingsGlyph,
  type LucideIcon,
} from "lucide-react";
`;
  const result = rewriteLucideReactImports(source, iconModules);

  assert.equal(result.rewrittenIcons, 2);
  assert.match(result.code, /import \{ useState \} from "react";/);
  assert.match(result.code, /import \{ type LucideIcon \} from "lucide-react";/);
  assert.match(
    result.code,
    /import ArrowRight from "lucide-react\/dist\/esm\/icons\/arrow-right\.js";/,
  );
  assert.match(
    result.code,
    /import SettingsGlyph from "lucide-react\/dist\/esm\/icons\/settings\.js";/,
  );
});

test("never spans an earlier non-Lucide named import", () => {
  const source = `
import {
  unrelatedValue,
} from "other-package";
import { ArrowRight } from "lucide-react";
`;
  const result = rewriteLucideReactImports(source, iconModules);

  assert.equal(result.rewrittenIcons, 1);
  assert.match(result.code, /unrelatedValue,[\s\S]*?from "other-package";/);
  assert.doesNotMatch(result.code, /unrelatedValue from "lucide-react\/dist/);
});

test("fails closed when a runtime export has no direct icon mapping", () => {
  assert.throws(
    () => rewriteLucideReactImports('import { icons } from "lucide-react";', iconModules),
    /runtime export icons is not a direct icon module/,
  );
});

test("rejects ambiguous or unsafe barrel mappings", () => {
  assert.throws(
    () =>
      mapLucideIconModules(`
export { default as ArrowRight } from './icons/arrow-right.js';
export { default as ArrowRight } from './icons/arrow-left.js';
`),
    /Ambiguous Lucide icon export ArrowRight/,
  );
  assert.throws(
    () =>
      mapLucideIconModules(
        "export { default as ArrowRight } from './icons/../unsafe.js';",
      ),
    /Unsafe Lucide icon export mapping/,
  );
});

test("collects runtime icons and rewrites them to one generated bundle", () => {
  const source = `
import {
  ArrowRight,
  Settings as SettingsGlyph,
  type LucideIcon,
} from "lucide-react";
`;
  assert.deepEqual(
    [...collectLucideRuntimeExports(source, iconModules)],
    ["ArrowRight", "Settings"],
  );

  const result = rewriteLucideReactImportsFromBundle(
    source,
    iconModules,
    "transitionforward:lucide-used-icons",
  );
  assert.equal(result.rewrittenIcons, 2);
  assert.match(result.code, /import \{ type LucideIcon \} from "lucide-react";/);
  assert.match(
    result.code,
    /import \{ ArrowRight, Settings as SettingsGlyph \} from "transitionforward:lucide-used-icons";/,
  );
});

test("builds one component per used Lucide module while preserving aliases", () => {
  const manyModules = new Map();
  const manyExports = [];
  for (let index = 0; index < 100; index += 1) {
    const exportName = `Icon${index}`;
    const moduleName = `icon-${index}.js`;
    manyModules.set(exportName, moduleName);
    manyExports.push(exportName);
  }
  manyModules.set("IconAlias", "icon-0.js");
  manyExports.push("IconAlias");

  const bundle = createLucideIconBundle(manyExports, manyModules, (moduleName) => `
const __iconNode = [["path", { d: ${JSON.stringify(moduleName)}, key: "key" }]];
const Icon = createLucideIcon("${moduleName.slice(0, -3)}", __iconNode);
`);
  assert.match(bundle, /import createLucideIcon from "lucide-react\/dist\/esm\/createLucideIcon\.js";/);
  assert.equal((bundle.match(/const __TransitionForwardLucide/g) ?? []).length, 100);
  assert.match(
    bundle,
    /__TransitionForwardLucide0 as Icon0, __TransitionForwardLucide0 as IconAlias/,
  );
});
