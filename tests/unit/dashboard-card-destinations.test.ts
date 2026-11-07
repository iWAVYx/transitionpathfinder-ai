import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isAllowed } from "../../src/lib/role-policy";
import { RELATED_TOOLS } from "../../src/lib/dashboard/related-tools";
import { getDemoFeature } from "../../src/lib/demo/feature-routes";

const read = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");
const routes = read("routeTree.gen.ts");
const roles = [
  ["parent", "LiveFamilyWorkspaceOverview"],
  ["student", "LiveStudentWorkspaceOverview"],
  ["educator", "LiveEducatorWorkspaceOverview"],
  ["school_admin", "role/SchoolAdminOverviewGrid"],
  ["district_admin", "role/DistrictAdminOverviewGrid"],
  ["partner", "role/PartnerOverviewGrid"],
] as const;

describe("dashboard card destinations", () => {
  it.each(roles)("%s card links are registered and role-authorized", (role, component) => {
    const source = read(`components/dashboard/${component}.tsx`);
    const links = [...source.matchAll(/\bto: "([^"]+)"/g)].map(match => match[1]);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const path = link.split("?")[0];
      expect(routes, `${role}: ${path}`).toContain(`'${path}'`);
      expect(isAllowed(path, [role]), `${role}: ${path}`).toBe(true);
    }
  });
  it("related links remain registered, authorized and have real demo counterparts", () => {
    for (const [key, links] of Object.entries(RELATED_TOOLS)) {
      const role = key.split(":")[0];
      for (const link of links) {
        const path = link.to.split("?")[0];
        expect(routes, key).toContain(`'${path}'`);
        expect(isAllowed(path, [role === "family" ? "parent" : role]), key).toBe(true);
        const demo = link.demoTo.split("?")[0];
        if (demo.startsWith("/demo/feature/")) {
          const parts = demo.split("/");
          expect(getDemoFeature(parts[3] as never, parts[4]), key).not.toBeNull();
        } else {
          const registered = demo.startsWith("/demo/workspace/") ? "/demo/workspace/$stage" : demo;
          expect(routes.includes(`'${registered}'`), `${key}: ${demo}`).toBe(true);
        }
      }
    }
  });
  it("places family goal links within pathway reports in both dashboard modes", () => {
    expect(RELATED_TOOLS["family:student-profile"].some(link => link.to === "/goals")).toBe(false);
    expect(RELATED_TOOLS["family:pathway-report"].some(link => link.to === "/goals")).toBe(true);
    expect(read("components/dashboard/LiveFamilyWorkspaceOverview.tsx")).toContain('relatedActions: RELATED_TOOLS["family:pathway-report"]');
    expect(read("components/dashboard/role/ParentOverviewGrid.tsx")).toContain('RELATED_TOOLS[`family:${tile.featureId}`]');
  });
});
