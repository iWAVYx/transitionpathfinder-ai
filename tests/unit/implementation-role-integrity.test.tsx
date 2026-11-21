// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
const state = vi.hoisted(() => ({
  school: null as any,
  district: null as any,
  org: { id: "synthetic-org", name: "Synthetic Organization" },
  readiness: vi.fn(),
  ensureRole: vi.fn(),
  guardRoles: [] as any[],
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<any>()),
  createFileRoute: () => (options: any) => ({ options }),
}));
vi.mock("@/lib/route-role-guard", () => ({ ensureRoleAccess: state.ensureRole }));
vi.mock("@/components/withRoleGuard", () => ({
  withRoleGuard: (roles: any, component: any) => {
    state.guardRoles.push(roles);
    return component;
  },
}));
vi.mock("@/components/school/SchoolPageShell", () => ({
  useSchoolDashboard: () => ({
    data: state.school,
    loading: false,
    orgId: state.org.id,
    reload: vi.fn(),
  }),
  SchoolPageShell: ({ children }: any) => children(state.org, state.school),
}));
vi.mock("@/components/district/DistrictPageShell", () => ({
  useDistrictDashboard: () => ({
    data: state.district,
    loading: false,
    districtId: state.org.id,
    reload: vi.fn(),
  }),
  DistrictPageShell: ({ children }: any) => children(state.org, state.district),
}));
vi.mock("@/lib/school-admin.functions", () => ({ getSchoolReadiness: state.readiness }));
import { Route as School } from "@/routes/_authenticated/school.implementation";
import { Route as District } from "@/routes/_authenticated/district.implementation";
const member = (status: string) => ({
  membership_id: status,
  full_name: `Synthetic ${status}`,
  email: null,
  user_id: status,
  role_within_org: "educator",
  status,
  joined_at: "2026-10-01",
});
beforeEach(() => {
  localStorage.clear();
  state.school = {
    members: [member("active")],
    pending_members: [member("invited"), member("removed"), member("suspended")],
    metrics: {
      students_count: 2,
      reports_count: 5,
      students_with_report: 1,
      active_members: 1,
      total_members: 4,
      documents_count: 0,
    },
  };
  state.district = {
    team: [member("active")],
    pending_team: [member("invited"), member("removed"), member("suspended")],
    schools: [
      {
        id: "child",
        name: "Recorded School",
        active_members: 1,
        students_count: 2,
        students_with_report: 1,
        reports_count: 5,
      },
    ],
    metrics: { students_count: 2, reports_count: 5, pct_with_report: 50 },
  };
  state.readiness.mockResolvedValue({
    total_students: 2,
    with_pathway_report: 1,
    with_active_goals: 0,
    with_open_action_items: 0,
    avg_open_actions_per_student: 0,
  });
});
afterEach(() => {
  cleanup();
  state.readiness.mockReset();
  state.ensureRole.mockReset();
  localStorage.clear();
});
it.each([
  ["school", School],
  ["district", District],
] as const)(
  "actual %s Implementation uses source statuses and no fabricated staff training percentages",
  async (role, route) => {
    const Page = route.options.component!;
    render(<Page />);
    await screen.findByText("No training sessions scheduled yet.");
    const table = screen.getByRole("table");
    for (const label of ["Active", "Invited", "Removed", "Suspended"])
      expect(within(table).getByText(label)).toBeTruthy();
    expect(within(table).getAllByText("Not recorded")).toHaveLength(4);
    expect(table.textContent).not.toContain("100%");
    expect(table.textContent).not.toContain("25%");
    expect(
      screen.getByText(new RegExp(`No confirmed reporting dates are connected to this ${role}`)),
    ).toBeTruthy();
    expect(localStorage.length).toBe(0);
  },
);
it("School recorded-member milestone does not imply training or usage and versions do not meet majority coverage", async () => {
  const Page = School.options.component!;
  render(<Page />);
  await screen.findByText("Total Students");
  expect(screen.getByText("Team Members Added")).toBeTruthy();
  expect(screen.queryByText("Staff onboarded")).toBeNull();
  const majority = screen.getByText("Majority of students have a Pathway Report").closest("li")!;
  expect(within(majority).queryByText("Met")).toBeNull();
  expect(document.body.textContent).not.toContain("active and using the platform");
});
it("District does not claim every school has an administrator, completed training or a fully staffed team", () => {
  const Page = District.options.component!;
  render(<Page />);
  expect(screen.getByText("School Staff Access Established")).toBeTruthy();
  expect(screen.getByText("At least one connected school has active staff access.")).toBeTruthy();
  expect(screen.queryByText("District team fully staffed")).toBeNull();
  expect(document.body.textContent).not.toContain("reports are being generated regularly");
  expect(screen.getAllByText("Staff and Students Connected")).toHaveLength(2);
});
it("District broad coverage stage describes its numeric thresholds without inventing recurring use", () => {
  state.district.schools[0].active_members = 3;
  state.district.schools[0].students_with_report = 2;
  const Page = District.options.component!;
  render(<Page />);
  expect(screen.getAllByText("Broad Report Coverage")).toHaveLength(2);
  expect(
    screen.getByText(
      "At least three active staff memberships and recorded reports for at least 60% of students.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("Mature")).toBeNull();
});
it("retains existing role policy wiring rather than adding personal-planning roles", async () => {
  expect(state.guardRoles).toContainEqual(["school_admin", "admin"]);
  await District.options.beforeLoad!({} as any);
  expect(state.ensureRole).toHaveBeenCalledWith(["district_admin", "admin"]);
});
