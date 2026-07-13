// Regression: every role's Overview Grid must have unique tile destinations.
//
// Two tiles pointing to the exact same URL (path + search params) is almost
// always a copy-paste bug that collapses distinct workflows into one page.
// The Partner grid previously had three tiles all pointing at
// /partners-manage/opportunities; they now differ via ?status=. This test
// pins that fix and prevents future regressions.
//
// Run with: bun run test:unit

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");

const ROLE_GRIDS: Record<string, string> = {
  student: "src/components/dashboard/role/StudentOverviewGrid.tsx",
  parent: "src/components/dashboard/role/ParentOverviewGrid.tsx",
  educator: "src/components/dashboard/role/EducatorOverviewGrid.tsx",
  school_admin: "src/components/dashboard/role/SchoolAdminOverviewGrid.tsx",
  district_admin: "src/components/dashboard/role/DistrictAdminOverviewGrid.tsx",
  partner: "src/components/dashboard/role/PartnerOverviewGrid.tsx",
};

type Cta = { to: string; search: string; raw: string };

// Extract every `cta={{ ... }}` object literal, then pull `to` and any
// key/value pairs under `search`. We serialize search into a stable string
// so `?status=approved` and `?status=pending_review` count as distinct.
function extractCtas(src: string): Cta[] {
  const out: Cta[] = [];
  // Match both JSX prop form `cta={{ ... }}` and object-property form
  // `cta: { ... }` (used inside TILES arrays). Body captured with a
  // brace-balanced scan so nested `search: { ... }` is included.
  const headRe = /\bcta\s*(?:=\{\s*\{|:\s*\{)/g;
  let head: RegExpExecArray | null;
  while ((head = headRe.exec(src))) {
    let depth = 1;
    let i = head.index + head[0].length;
    const start = i;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    if (depth !== 0) continue;
    const body = src.slice(start, i - 1);

    const toMatch = body.match(/\bto:\s*["']([^"']+)["']/);
    if (!toMatch) continue;
    const to = toMatch[1];

    let search = "";
    const searchMatch = body.match(/\bsearch:\s*\{([^}]*)\}/);
    if (searchMatch) {
      const pairs: string[] = [];
      const pairRe = /(\w+)\s*:\s*["']([^"']+)["']/g;
      let p: RegExpExecArray | null;
      while ((p = pairRe.exec(searchMatch[1]))) {
        pairs.push(`${p[1]}=${p[2]}`);
      }
      pairs.sort();
      search = pairs.join("&");
    }
    out.push({ to, search, raw: `${to}${search ? `?${search}` : ""}` });
  }
  return out;
}

describe.each(Object.entries(ROLE_GRIDS))(
  "dashboard tile destinations: %s",
  (role, file) => {
    const src = readFileSync(resolve(ROOT, file), "utf8");
    const ctas = extractCtas(src);

    it(`${role} grid exposes CTAs`, () => {
      expect(ctas.length).toBeGreaterThan(0);
    });

    it("has no duplicate tile destinations (path + search)", () => {
      const counts = new Map<string, number>();
      for (const c of ctas) counts.set(c.raw, (counts.get(c.raw) ?? 0) + 1);
      const dupes = [...counts.entries()]
        .filter(([, n]) => n > 1)
        .map(([k, n]) => `${k} ×${n}`);
      expect(dupes, `duplicate tile destinations in ${role} grid`).toEqual([]);
    });

    it("every CTA points to an absolute app path", () => {
      const bad = ctas.filter((c) => !c.to.startsWith("/"));
      expect(bad.map((c) => c.raw)).toEqual([]);
    });
  },
);
