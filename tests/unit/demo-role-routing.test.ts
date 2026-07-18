/**
 * Route-transition matrix for the centralized demo role-switch resolver.
 * Locks in every case listed in the "TESTING" section of the requirements
 * so no future edit can silently reintroduce the Partner → Student →
 * Workspace bug.
 */
import { describe, it, expect } from "vitest";
import {
  resolveDemoRoleDestination,
  classifyDemoRoute,
} from "@/lib/demo/role-routing";

describe("classifyDemoRoute", () => {
  it("recognizes canonical demo routes", () => {
    expect(classifyDemoRoute("/demo").kind).toBe("demo-overview");
    expect(classifyDemoRoute("/demo/student").kind).toBe("role-dashboard");
    expect(classifyDemoRoute("/demo/partner").kind).toBe("role-dashboard");
    expect(classifyDemoRoute("/demo/workspace/roadmap")).toEqual({
      kind: "transition-workspace",
      stage: "roadmap",
    });
    expect(classifyDemoRoute("/demo/feature/family/partner-network")).toEqual({
      kind: "shared-role-feature",
      role: "family",
      slug: "partner-network",
    });
    expect(classifyDemoRoute("/demo/report").kind).toBe("pathway-report");
  });

  it("treats legacy /demo/<step> aliases as transition-workspace", () => {
    expect(classifyDemoRoute("/demo/voice").kind).toBe("transition-workspace");
    expect(classifyDemoRoute("/demo/meeting").kind).toBe("transition-workspace");
  });
});

describe("resolveDemoRoleDestination — canonical dashboards", () => {
  const cases: Array<[string, string, string, string]> = [
    // [description, currentPath, targetRole, expectedTo]
    ["Partner dashboard → Student", "/demo/partner", "student", "/demo/student"],
    ["Student dashboard → Partner", "/demo/student", "partner", "/demo/partner"],
    ["Student dashboard → School Admin", "/demo/student", "school-admin", "/demo/school-admin"],
    ["Student dashboard → District Admin", "/demo/student", "district-admin", "/demo/district-admin"],
    ["School Admin → Educator", "/demo/school-admin", "educator", "/demo/educator"],
    ["District Admin → Parent", "/demo/district-admin", "family", "/demo/family"],
    ["Demo overview → Student", "/demo", "student", "/demo/student"],
    ["Demo overview → Partner", "/demo", "partner", "/demo/partner"],
  ];
  for (const [desc, from, target, expected] of cases) {
    it(desc, () => {
      const dest = resolveDemoRoleDestination({
        currentPath: from,
        targetRole: target as never,
      });
      expect(dest.to).toBe(expected);
    });
  }

  it("never restores workspace when switching from a role dashboard", () => {
    // The regression: Partner → Student was returning /demo/workspace/*.
    const dest = resolveDemoRoleDestination({
      currentPath: "/demo/partner",
      targetRole: "student",
    });
    expect(dest.to).toBe("/demo/student");
    expect(dest.to).not.toMatch(/\/workspace\//);
  });
});

describe("resolveDemoRoleDestination — Transition Workspace exception", () => {
  it("Student workspace → Family stays on the same stage", () => {
    const dest = resolveDemoRoleDestination({
      currentPath: "/demo/workspace/roadmap",
      targetRole: "family",
    });
    expect(dest.to).toBe("/demo/workspace/roadmap");
  });

  it("Student workspace → Educator stays on the same stage", () => {
    const dest = resolveDemoRoleDestination({
      currentPath: "/demo/workspace/voice",
      targetRole: "educator",
    });
    expect(dest.to).toBe("/demo/workspace/voice");
  });

  it("Student workspace → Partner exits to Partner dashboard", () => {
    const dest = resolveDemoRoleDestination({
      currentPath: "/demo/workspace/roadmap",
      targetRole: "partner",
    });
    expect(dest.to).toBe("/demo/partner");
  });

  it("Student workspace → Partner → Student = Student dashboard (no stage restore)", () => {
    const exit = resolveDemoRoleDestination({
      currentPath: "/demo/workspace/roadmap",
      targetRole: "partner",
    });
    expect(exit.to).toBe("/demo/partner");
    // Now visitor is on /demo/partner. Switching back to Student MUST land on
    // the Student dashboard — not the previously-visited workspace stage.
    const back = resolveDemoRoleDestination({
      currentPath: exit.to,
      targetRole: "student",
    });
    expect(back.to).toBe("/demo/student");
  });

  it("Family workspace → School Admin → Family = Family dashboard", () => {
    const exit = resolveDemoRoleDestination({
      currentPath: "/demo/workspace/roadmap",
      targetRole: "school-admin",
    });
    expect(exit.to).toBe("/demo/school-admin");
    const back = resolveDemoRoleDestination({
      currentPath: exit.to,
      targetRole: "family",
    });
    expect(back.to).toBe("/demo/family");
  });

  it("Preserves student context when exiting workspace", () => {
    const dest = resolveDemoRoleDestination({
      currentPath: "/demo/workspace/roadmap",
      targetRole: "partner",
      studentId: "jordan-rivera",
    });
    expect(dest.to).toBe("/demo/partner");
    expect(dest.search).toEqual({ student: "jordan-rivera" });
  });
});

describe("resolveDemoRoleDestination — shared feature exception", () => {
  it("Partner Network → supported role preserves feature route", () => {
    const dest = resolveDemoRoleDestination({
      currentPath: "/demo/feature/family/partner-network",
      targetRole: "student",
    });
    expect(dest.to).toBe("/demo/feature/student/partner-network");
  });

  it("Shared feature switching to unsupported role falls back to canonical dashboard", () => {
    const dest = resolveDemoRoleDestination({
      currentPath: "/demo/feature/student/some-slug-that-does-not-exist",
      targetRole: "partner",
    });
    expect(dest.to).toBe("/demo/partner");
    expect(dest.to).not.toMatch(/\/workspace\//);
  });
});
