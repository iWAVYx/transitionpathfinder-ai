import { SCHOOL_PROFILES } from "../../src/lib/demo/role-contexts";
import { getSchoolAdminFeatureDetails } from "../../src/lib/demo/school-admin/feature-details";
import ts from "typescript";
import { RELATED_TOOLS } from "../../src/lib/dashboard/related-tools";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workspaceToolGroups } from "../../src/lib/workspace-tools";
import { isAllowed } from "../../src/lib/role-policy";
import { DEMO_NEXT_ACTIONS } from "../../src/lib/next-actions/demo-fixtures";
import {
  getDemoFeature,
  listDemoFeatures,
  isDemoRole,
  resolveDemoFeatureRoute,
} from "../../src/lib/demo/feature-routes";
import { augmentFeature } from "../../src/lib/demo/feature-augment";

const read = (file: string) => readFileSync(new URL(`../../src/${file}`, import.meta.url), "utf8");
const overview = (role: string) => read(`components/dashboard/Live${role}WorkspaceOverview.tsx`);
const grid = (role: string) => read(`components/dashboard/role/${role}OverviewGrid.tsx`);

// Only rendered card CTAs and explicitly attached related actions qualify.
// A route mentioned in preview/sample metadata is not dashboard evidence.
function dashboardDestinations(source: string): Set<string> {
  const destinations = new Set<string>();
  const file = ts.createSourceFile(
    "dashboard.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function visit(node: ts.Node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(file) === "cta") {
      function collect(child: ts.Node) {
        if (
          ts.isPropertyAssignment(child) &&
          child.name.getText(file) === "to" &&
          ts.isStringLiteral(child.initializer)
        ) {
          destinations.add(child.initializer.text);
        }
        ts.forEachChild(child, collect);
      }
      collect(node.initializer);
    }
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(file) === "relatedActions" &&
      ts.isElementAccessExpression(node.initializer)
    ) {
      const key = node.initializer.argumentExpression;
      if (
        node.initializer.expression.getText(file) === "RELATED_TOOLS" &&
        ts.isStringLiteral(key)
      ) {
        for (const tool of RELATED_TOOLS[key.text] ?? []) destinations.add(tool.to);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return destinations;
}

describe("role tools connect to the role's existing dashboard", () => {
  it("dedicated previews use selected-student reports and never unrelated candidate panels", () => {
    const source = read("routes/demo_.feature.$role.$slug.tsx");
    expect(source).toContain("renderRichModule(demoRole, slug, profileId)");
    expect(source).toContain('profile={getDemoProfile(profileId)} audience="student"');
    expect(source).toContain('profile={getDemoProfile(profileId)} audience="family"');
    for (const unrelated of [
      "StudentFitSummariesCard",
      "PartnerMatchesCard",
      "IepTranslatorCard",
      "StudentPathwaySections",
    ])
      expect(source).not.toContain(unrelated);
    expect(source).toContain("<DemoStudentVoicePreview profile={getDemoProfile(profileId)} />");
  });
  it("school completion percentages agree with their fictional report counts", () => {
    for (const school of Object.values(SCHOOL_PROFILES)) {
      const percent = Math.round((school.reportsComplete / school.iepCaseload) * 100);
      expect(school.completionPct).toBe(percent);
      const summary = getSchoolAdminFeatureDetails(school.id)["school-overview"];
      expect(summary.stats?.find((stat) => stat.label === "Reports complete")?.value).toBe(
        `${percent}%`,
      );
    }
  });
  it("organization and resource previews cannot embed unrelated fixed example panels", () => {
    const source = read("routes/demo_.feature.$role.$slug.tsx");
    for (const panel of [
      "ComplianceOverviewCard",
      "TransitionEvidenceCard",
      "CaseloadRollupsCard",
      "DistrictComplianceCard",
      "DistrictEvidenceCoverageCard",
      "DistrictTrendMetricsCard",
      "EvidenceReviewCard",
      "DataGapsCard",
      "AdvocacyResourcesCard",
    ])
      expect(source).not.toContain(panel);
    expect(source).toContain("${school.shortName} · ${detail.eyebrow}");
    expect(source).toContain("${district.shortName} · ${detail.eyebrow}");
  });
  it("unavailable student previews and invalid identifiers cannot resolve as published tools", () => {
    for (const slug of ["documents", "meeting-prep", "constructor", "__proto__", "missing"]) {
      expect(getDemoFeature("student", slug)).toBeNull();
      expect(resolveDemoFeatureRoute("student", slug)).toBe("/demo/student");
    }
    for (const role of ["constructor", "__proto__", "unknown", null])
      expect(isDemoRole(role)).toBe(false);
    expect(getDemoFeature("family", "documents")).not.toBeNull();
    expect(getDemoFeature("educator", "meeting-prep")).not.toBeNull();
  });
  it("every published demo primary action opens a registered route for its role", () => {
    const routes = read("routeTree.gen.ts");
    const failures: string[] = [];
    for (const { role, detail } of listDemoFeatures()) {
      const to = detail.primaryAction.to;
      const accountRole =
        role === "family" ? "parent" : role === "owner" ? "admin" : role.replaceAll("-", "_");
      if (!isAllowed(to, [accountRole]) || !routes.includes(`'${to}'`))
        failures.push(`${role}/${detail.id} → ${to}`);
    }
    expect(failures).toEqual([]);
  });
  it("every secondary demo action opens an existing route allowed for its role", () => {
    const routes = read("routeTree.gen.ts");
    for (const { role, detail } of listDemoFeatures()) {
      const action = augmentFeature(role, detail).secondaryAction;
      const accountRole =
        role === "family" ? "parent" : role === "owner" ? "admin" : role.replaceAll("-", "_");
      expect(isAllowed(action.to, [accountRole]), `${role}: ${detail.id}`).toBe(true);
      expect(routes, action.to).toContain(`'${action.to}'`);
    }
  });
  it.each([
    ["parent", () => overview("Family")],
    ["student", () => overview("Student")],
    ["educator", () => overview("Educator")],
    ["school_admin", () => grid("SchoolAdmin")],
    ["district_admin", () => grid("DistrictAdmin")],
    ["partner", () => grid("Partner")],
  ] as const)(
    "%s menu destinations are authorized and present on its dashboard",
    (role, source) => {
      const destinations = dashboardDestinations(source());
      const routes = read("routeTree.gen.ts");
      const items = workspaceToolGroups([role])[0].items;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        const pathname = item.to.split("?")[0];
        expect(isAllowed(pathname, [role]), item.to).toBe(true);
        expect(destinations.has(pathname), item.to).toBe(true);
        expect(routes, item.to).toContain(`'${pathname}'`);
      }
    },
  );

  it("deduplicates multi-role destinations and preserves the owner-only menu", () => {
    const items = workspaceToolGroups(["parent", "teacher"])[0].items;
    expect(new Set(items.map((item) => item.to)).size).toBe(items.length);
    for (const roles of [["admin"], ["admin", "teacher"]]) {
      const management = workspaceToolGroups(roles)[0];
      expect(management.label).toBe("Website management");
      expect(management.items.every((item) => item.to.startsWith("/owner/"))).toBe(true);
    }
    expect(workspaceToolGroups(["parent"], true)[0].label).toBe("Website management");
  });

  it("unknown and unloaded roles never receive a planning tool catalog", () => {
    for (const roles of [[], ["unknown"], ["administrator"]]) {
      expect(workspaceToolGroups(roles).map((group) => group.label)).toEqual(["Account"]);
    }
  });

  it("owner shortcuts exist in the management hub and route tree", () => {
    const hub = read("components/owner/OwnerShell.tsx");
    const routes = read("routeTree.gen.ts");
    for (const item of workspaceToolGroups(["admin"])[0].items) {
      expect(hub).toContain(`to: "${item.to}"`);
      expect(routes).toContain(`'${item.to}'`);
    }
  });

  it("does not reintroduce the unrelated legacy tool catalog", () => {
    const removed = new Set([
      "/teacher-portal",
      "/meetings",
      "/meeting-templates",
      "/trust",
      "/demo-mode",
      "/messages",
      "/feed",
      "/forms",
      "/opportunities",
      "/insights",
      "/analytics",
      "/partners-manage/impact",
      "/bridgeforward",
    ]);
    const groups = workspaceToolGroups([
      "parent",
      "student",
      "educator",
      "school_admin",
      "district_admin",
      "partner",
    ]);
    for (const item of groups.flatMap((group) => group.items))
      expect(removed.has(item.to)).toBe(false);
  });

  it("student dashboard never offers the protected family/educator tools", () => {
    const source = overview("Student");
    for (const blocked of ["/documents", "/goals", "/pathway", "/students/$studentId"]) {
      expect(source).not.toContain(`to: "${blocked}"`);
    }
    expect(isAllowed("/documents", ["student"])).toBe(false);
    expect(isAllowed("/goals", ["student"])).toBe(false);
    expect(source).toContain('to: "/pathway/student"');
  });

  it.each(["school_admin", "district_admin", "partner"] as const)(
    "%s demo actions open an existing feature for that role, not a dashboard loop",
    (role) => {
      for (const action of DEMO_NEXT_ACTIONS[role]) {
        const parts = action.ctaRoute.split("/");
        expect(parts.slice(0, 4)).toEqual(["", "demo", "feature", role.replaceAll("_", "-")]);
        expect(getDemoFeature(parts[3] as never, parts[4]), action.id).not.toBeNull();
      }
    },
  );
});
