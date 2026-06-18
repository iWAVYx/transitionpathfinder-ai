// Static regression checks for every signed-in role dashboard.
//
// Why static, not rendered? Rendering a TanStack-Start route component
// outside the router/SSR shell is fragile (loaders, contexts, server fn
// imports). For "no duplicate links" and "no dead buttons" we only need
// the source tree — every offender is visible without executing React.
//
// Real-browser checks (viewport layout, refresh persistence, empty/loading/
// error states served by the loader) live in
//   tests/e2e/dashboard-regression.signedin.spec.ts
//
// Run with:  bun run test:unit

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");

// Role → primary dashboard route file. Each one is the landing page used
// by fallbackPathFor() in src/lib/role-policy.ts.
const ROLE_DASHBOARDS: Record<string, string> = {
  student: "src/routes/_authenticated/dashboard.tsx",
  parent: "src/routes/_authenticated/dashboard.tsx",
  educator: "src/routes/_authenticated/caseload.tsx",
  school_admin: "src/routes/_authenticated/school.overview.tsx",
  district_admin: "src/routes/_authenticated/district.overview.tsx",
  partner: "src/routes/_authenticated/partners-manage.tsx",
  owner: "src/routes/_authenticated/owner.index.tsx",
};

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

// Walk a dashboard file plus every local `@/components/...` it imports so
// the checks cover the whole rendered subtree, not just the route file.
function collectSources(entry: string, seen = new Set<string>()): string[] {
  if (seen.has(entry)) return [];
  seen.add(entry);
  let src: string;
  try {
    src = read(entry);
  } catch {
    return [];
  }
  const out = [src];
  const importRe = /from\s+["']@\/([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(src))) {
    const candidates = [
      `src/${m[1]}.tsx`,
      `src/${m[1]}.ts`,
      `src/${m[1]}/index.tsx`,
      `src/${m[1]}/index.ts`,
    ];
    for (const c of candidates) {
      try {
        if (statSync(join(ROOT, c)).isFile()) {
          // Only follow components / lib used by dashboards. Skip ui/* primitives
          // — they're shared and not the source of duplicate links / dead buttons.
          if (c.includes("/components/ui/")) break;
          out.push(...collectSources(c, seen));
          break;
        }
      } catch {
        /* not this candidate */
      }
    }
  }
  return out;
}

describe.each(Object.entries(ROLE_DASHBOARDS))(
  "dashboard static regression: %s",
  (role, file) => {
    const sources = collectSources(file);
    const joined = sources.join("\n/*---FILE BOUNDARY---*/\n");

    it(`${role} dashboard file exists`, () => {
      expect(sources.length).toBeGreaterThan(0);
    });

    it("has no duplicate <Link to=\"…\"> in the same component", () => {
      // Per source file: collect every literal `to="/path"` and assert no
      // path repeats. Repeats almost always indicate accidental
      // copy-paste duplicate nav cards.
      const offenders: string[] = [];
      for (const src of sources) {
        const matches = [
          ...src.matchAll(/<Link\b[^>]*\bto=["'](\/[^"']+)["']/g),
        ].map((m) => m[1]);
        const counts = new Map<string, number>();
        for (const t of matches) counts.set(t, (counts.get(t) ?? 0) + 1);
        for (const [path, n] of counts) {
          if (n > 1) offenders.push(`${path} ×${n}`);
        }
      }
      expect(offenders, `duplicate Link targets in ${role} dashboard`).toEqual([]);
    });

    it("has no obviously dead <Button> (no onClick / type / asChild / form)", () => {
      // Heuristic: a <Button …> open-tag with NO onClick, type=, asChild,
      // form=, formAction=, disabled, or being a child of <Link>/<a>.
      // We accept false-negatives over false-positives — only flag tags
      // that are clearly inert.
      const offenders: string[] = [];
      // Match `<Button ... >` (not self-closing-only) where the attribute
      // list has none of the live signals.
      const btnRe = /<Button\b([^>]*)>/g;
      const liveAttr = /\b(onClick|type=|asChild|form=|formAction=|disabled|aria-disabled|onPointerDown|onMouseDown)\b/;
      for (const src of sources) {
        let m: RegExpExecArray | null;
        while ((m = btnRe.exec(src))) {
          const attrs = m[1];
          if (liveAttr.test(attrs)) continue;
          // Skip Button used purely as a styled wrapper around a Link
          // (asChild covers most, but some patterns omit it).
          const idx = m.index;
          const before = src.slice(Math.max(0, idx - 120), idx);
          const after = src.slice(m.index + m[0].length, m.index + m[0].length + 200);
          if (/<Link\b|<a\b/.test(after)) continue;
          if (/asChild/.test(before)) continue;
          offenders.push(m[0].slice(0, 100));
        }
      }
      expect(
        offenders,
        `dead buttons in ${role} dashboard (no handler, no type, not wrapping a Link)`,
      ).toEqual([]);
    });

    it("handles empty/loading/error when it queries data", () => {
      // If the dashboard uses TanStack Query, it must expose all three
      // states somewhere in its rendered tree. We accept any of the
      // common conventions used elsewhere in the codebase.
      const usesQuery = joined.includes("useSuspenseQuery") ||
        joined.includes("useQuery(");
      if (!usesQuery) return;

      const hasLoading = /Skeleton|isLoading|isPending|<Suspense\b|Loading/.test(joined);
      const hasError = /errorComponent|isError|onError|ErrorState|ErrorBoundary|catch/.test(joined);
      const hasEmpty = /EmptyState|length === 0|length === 0|\.length\s*===\s*0|No\s+\w+\s+yet/.test(joined);

      expect(hasLoading, `${role} dashboard queries data but has no loading state`).toBe(true);
      expect(hasError, `${role} dashboard queries data but has no error state`).toBe(true);
      expect(hasEmpty, `${role} dashboard queries data but has no empty state`).toBe(true);
    });
  },
);
