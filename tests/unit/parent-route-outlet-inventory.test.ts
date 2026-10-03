import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("generated parent route inventory", () => {
  it("requires every parent page with children to render an outlet", () => {
    const tree = readFileSync(resolve("src/routeTree.gen.ts"), "utf8");
    const imports = new Map([...tree.matchAll(/import \{ Route as (\w+)Import \} from '([^']+)'/g)].map(m => [m[1], m[2]]));
    const parents = new Set<string>();
    for (const route of tree.matchAll(/const (\w+)\s*=\s*\w+Import.update\(\{(.*?)\}\s*as any\)/gs)) {
      const parent = /getParentRoute: \(\) => (\w+)/.exec(route[2]);
      if (parent) parents.add(parent[1]);
    }
    expect(parents.size).toBeGreaterThan(10);
    const masked: string[] = [];
    for (const parent of parents) {
      const imported = imports.get(parent);
      if (!imported) continue;
      const file = resolve("src", `${imported}.tsx`);
      if (!existsSync(file)) continue;
      const source = readFileSync(file, "utf8");
      if (/component\s*:/.test(source) && !/<(?:Outlet|RoutePageOutlet)[\s/>]/.test(source)) masked.push(imported);
    }
    expect(masked, "Parent pages must not hide nested tool pages").toEqual([]);
  });
});
