import { describe, expect, it } from "vitest";
import {
  backTargetFromWorkspace,
  coerceExpand,
  coerceRole,
  legacyWorkspaceRedirect,
  workspaceStageHref,
} from "@/lib/demo/nav";

describe("demo nav helpers", () => {
  it("coerces role to a valid DemoRoleId or undefined", () => {
    expect(coerceRole("student")).toBe("student");
    expect(coerceRole("family")).toBe("family");
    expect(coerceRole("nope")).toBeUndefined();
    expect(coerceRole(undefined)).toBeUndefined();
    expect(coerceRole(123)).toBeUndefined();
  });

  it("coerces expand values", () => {
    expect(coerceExpand(true)).toBe(true);
    expect(coerceExpand("true")).toBe(true);
    expect(coerceExpand("1")).toBe(true);
    expect(coerceExpand(false)).toBe(false);
    expect(coerceExpand(undefined)).toBe(false);
  });

  it("workspaceStageHref builds link options with clean search", () => {
    expect(workspaceStageHref("start")).toEqual({
      to: "/demo/workspace/$stage",
      params: { stage: "start" },
      search: {},
    });
    expect(workspaceStageHref("roadmap", { role: "family", expand: true })).toEqual({
      to: "/demo/workspace/$stage",
      params: { stage: "roadmap" },
      search: { role: "family", expand: true },
    });
  });

  it("backTargetFromWorkspace returns role preview when role is set", () => {
    expect(backTargetFromWorkspace({ role: "student" })).toEqual({
      to: "/demo/student",
      label: "Back To Student Preview",
    });
    expect(backTargetFromWorkspace({})).toEqual({
      to: "/demo",
      label: "Back To Demo Overview",
    });
  });

  it("legacyWorkspaceRedirect preserves role from incoming search", () => {
    expect(legacyWorkspaceRedirect("roadmap", { role: "family" })).toEqual({
      to: "/demo/workspace/$stage",
      params: { stage: "roadmap" },
      search: { role: "family", expand: true },
      replace: true,
    });
    expect(legacyWorkspaceRedirect("start", undefined)).toEqual({
      to: "/demo/workspace/$stage",
      params: { stage: "start" },
      search: { expand: true },
      replace: true,
    });
  });

  it("keeps the selected sample student in stage and dashboard return links", () => {
    expect(backTargetFromWorkspace({ role: "family", student: "sam" }).to).toBe(
      "/demo/family?student=sam",
    );
    expect(workspaceStageHref("roadmap", { role: "educator", student: "riley" }).search).toEqual({
      role: "educator",
      student: "riley",
    });
    expect(legacyWorkspaceRedirect("roadmap", { role: "family", student: "sam" }).search).toEqual({
      role: "family",
      student: "sam",
      expand: true,
    });
    expect(backTargetFromWorkspace({ role: "student", student: "not-a-sample" }).to).toBe(
      "/demo/student",
    );
  });
});
