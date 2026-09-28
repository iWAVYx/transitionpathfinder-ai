import { describe, expect, it } from "vitest";
import { dashboardHomeForRoles } from "@/lib/role-policy";

describe("return navigation from signed-in tools", () => {
  it.each([
    ["student", "/dashboard", "Dashboard"],
    ["parent", "/dashboard", "Dashboard"],
    ["guardian", "/dashboard", "Dashboard"],
    ["teacher", "/caseload", "Educator Dashboard"],
    ["educator", "/caseload", "Educator Dashboard"],
    ["case_manager", "/caseload", "Educator Dashboard"],
    ["school_admin", "/school/overview", "School Dashboard"],
    ["district_admin", "/district/overview", "District Dashboard"],
    ["partner", "/partners-manage", "Partner Dashboard"],
    ["admin", "/owner", "Owner Hub"],
  ])("returns the %s role to %s", (role, to, label) => {
    expect(dashboardHomeForRoles([role])).toEqual({ to, label });
  });

  it("uses the Owner Hub for a platform admin even if another role is primary", () => {
    expect(dashboardHomeForRoles(["parent"], true)).toEqual({
      to: "/owner",
      label: "Owner Hub",
    });
  });
});
