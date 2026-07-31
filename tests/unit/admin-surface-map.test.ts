import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Phase 1 deliverable guard: every Admin Hub route named in the
 * admin action → surface map must exist as a real route file, so the
 * mapping table can never drift into documenting routes we deleted.
 */

const ROOT = path.resolve(__dirname, "../..");
const MAP = readFileSync(path.join(ROOT, "docs/admin-action-surface-map.md"), "utf8");

function routeFileFor(routePath: string): string {
  // "/owner/content-health" -> "owner.content-health.tsx"
  const segments = routePath.replace(/^\//, "").split("/");
  const base = segments.join(".");
  return path.join(ROOT, "src/routes/_authenticated", `${base}.tsx`);
}

describe("admin action → surface map", () => {
  const owner = Array.from(new Set(MAP.match(/`\/owner\/[a-z-]+`/g) ?? [])).map((m) =>
    m.replace(/`/g, ""),
  );

  it("documents at least the core admin surfaces", () => {
    expect(owner.length).toBeGreaterThan(15);
  });

  it.each(owner)("%s resolves to a route file", (routePath) => {
    expect(existsSync(routeFileFor(routePath))).toBe(true);
  });

  it("covers the exceptional access rules", () => {
    expect(MAP).toContain("/owner/support-access");
    expect(MAP).toContain("15 minutes");
    expect(MAP).toContain("immutable");
  });
});
