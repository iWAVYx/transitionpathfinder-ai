import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

it("leaves the main landmark to SiteShell across every route and role", () => {
  const nested: string[] = [];
  const walk = (directory: string) => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (!path.endsWith(".tsx")) continue;
      const tree = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node, shell: boolean) => {
        if (ts.isJsxElement(node)) {
          const tag = node.openingElement.tagName.getText(tree);
          if (tag === "main" && shell) nested.push(`${path}:${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1}`);
          shell ||= tag === "SiteShell";
        }
        ts.forEachChild(node, child => visit(child, shell));
      };
      visit(tree, false);
    }
  };
  walk("src/routes");
  expect(nested, "A page inside SiteShell must not introduce another main landmark").toEqual([]);
});
