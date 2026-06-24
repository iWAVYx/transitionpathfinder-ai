/**
 * Security guard: no `*.functions.ts` file may import
 * `@/integrations/supabase/client.server` at module scope. The service-role
 * module must be lazy-loaded inside handler bodies (`await import(...)`),
 * otherwise the import keeps it reachable from the client bundle graph.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name.endsWith(".functions.ts") || name.endsWith(".functions.tsx")) out.push(p);
  }
  return out;
}

describe("no top-level supabaseAdmin import in *.functions.ts", () => {
  it("does not import client.server at module scope", () => {
    const files = walk("src");
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      // Strip dynamic imports and comments, then look for static import.
      const noComments = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      const noDynamic = noComments.replace(/await\s+import\([^)]*\)/g, "");
      if (/^\s*import[^;]*from\s+["']@\/integrations\/supabase\/client\.server["']/m.test(noDynamic)) {
        offenders.push(f);
      }
    }
    expect(offenders, `Use lazy await import() inside handlers instead:\n${offenders.join("\n")}`).toEqual([]);
  });
});
