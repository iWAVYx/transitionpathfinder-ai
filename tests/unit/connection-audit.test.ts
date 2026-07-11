// Regression: every demo role-preview tile with a `previewId` must reference
// a valid DemoPreviewId, and every Transition Workspace stage's
// `signedInRoute` must resolve to an actual route file under src/routes/.
//
// Written after the connection audit (docs/connection-audit.md) that found
// wrong previewIds (e.g. Action Items → "readiness-gaps") and workspace
// stage misroutes (family → /ppt-prep, action → /goals).
//
// Run with: bun run test:unit

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { DEMO_ROLES, DEMO_ROLE_ORDER } from "@/lib/demo/role-previews";
import { DEMO_PREVIEWS } from "@/components/demo/previews";
import { WORKSPACE_STAGES } from "@/lib/workspace/stages";

const ROOT = resolve(__dirname, "../..");
const AUTH_ROUTES_DIR = resolve(ROOT, "src/routes/_authenticated");
const ROUTES_DIR = resolve(ROOT, "src/routes");

/**
 * Given an app-relative pathname like "/school/overview" or "/students",
 * return true when a matching TanStack route file exists — either under
 * src/routes/_authenticated/ (dot- or slash-separated) or top-level.
 * Also honors dynamic $param segments (e.g. "/students/$studentId").
 */
function pathnameHasRoute(pathname: string): boolean {
  const segments = pathname.replace(/^\//, "").split("/").filter(Boolean);
  if (segments.length === 0) return existsSync(resolve(ROUTES_DIR, "index.tsx"));

  const flatDot = segments.join(".");
  const candidates = [
    // Under _authenticated (protected)
    resolve(AUTH_ROUTES_DIR, `${flatDot}.tsx`),
    resolve(AUTH_ROUTES_DIR, `${segments.join("/")}.tsx`),
    resolve(AUTH_ROUTES_DIR, `${flatDot}.index.tsx`),
    // Top-level (public)
    resolve(ROUTES_DIR, `${flatDot}.tsx`),
    resolve(ROUTES_DIR, `${segments.join("/")}.tsx`),
  ];
  for (const c of candidates) if (existsSync(c)) return true;

  // Underscore-prefixed sibling (e.g. partners-manage_.resources.tsx for /partners-manage/resources)
  if (segments.length >= 2) {
    const head = segments[0];
    const tail = segments.slice(1).join(".");
    const underscored = resolve(AUTH_ROUTES_DIR, `${head}_.${tail}.tsx`);
    if (existsSync(underscored)) return true;
  }

  // Fallback: scan directory listing for any file whose dot-name starts
  // with the flat path (catches nested layouts).
  const all = readdirSync(AUTH_ROUTES_DIR);
  const prefix = `${flatDot}.`;
  if (all.some((f) => f === `${flatDot}.tsx` || f.startsWith(prefix))) {
    return true;
  }
  return false;
}

describe("demo role-preview tiles", () => {
  const validPreviewIds = new Set(Object.keys(DEMO_PREVIEWS));

  for (const roleId of DEMO_ROLE_ORDER) {
    const role = DEMO_ROLES[roleId];
    it(`${roleId}: every previewId is registered in DEMO_PREVIEWS`, () => {
      const bad: string[] = [];
      for (const t of role.toolPreviews) {
        if (t.previewId && !validPreviewIds.has(t.previewId)) {
          bad.push(`${t.title} → ${t.previewId}`);
        }
      }
      expect(bad).toEqual([]);
    });

    it(`${roleId}: every cta.to starts with "/"`, () => {
      const bad: string[] = [];
      for (const t of role.toolPreviews) {
        if (t.cta && !t.cta.to.startsWith("/")) bad.push(`${t.title} → ${t.cta.to}`);
      }
      expect(bad).toEqual([]);
    });
  }
});

describe("transition workspace stages", () => {
  for (const stage of WORKSPACE_STAGES) {
    it(`${stage.id}: signedInRoute resolves to a route file`, () => {
      expect(
        pathnameHasRoute(stage.signedInRoute),
        `no route file matches ${stage.signedInRoute} for stage "${stage.id}"`,
      ).toBe(true);
    });
  }
});

describe("role dashboard grids", () => {
  const GRIDS = [
    "src/components/dashboard/role/StudentOverviewGrid.tsx",
    "src/components/dashboard/role/ParentOverviewGrid.tsx",
    "src/components/dashboard/role/EducatorOverviewGrid.tsx",
    "src/components/dashboard/role/SchoolAdminOverviewGrid.tsx",
    "src/components/dashboard/role/DistrictAdminOverviewGrid.tsx",
    "src/components/dashboard/role/PartnerOverviewGrid.tsx",
  ];

  for (const rel of GRIDS) {
    const src = readFileSync(resolve(ROOT, rel), "utf8");
    const routes = Array.from(
      src.matchAll(/\bto:\s*["'](\/[a-zA-Z0-9/_\-$]*)["']/g),
    ).map((m) => m[1]);

    it(`${rel}: every tile route resolves to a route file`, () => {
      const missing = routes.filter((r) => !pathnameHasRoute(r));
      expect(missing).toEqual([]);
    });
  }
});
