// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
const api = vi.hoisted(() => ({ update: vi.fn(), invite: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<any>()),
  createFileRoute: () => (options: any) => ({ options }),
}));
vi.mock("@/components/withRoleGuard", () => ({
  withRoleGuard: (_roles: any, component: any) => component,
}));
vi.mock("@/lib/school-admin.functions", () => ({
  updateMembershipStatus: api.update,
  inviteSchoolTeammate: api.invite,
}));
vi.mock("@/lib/district-admin.functions", () => ({ inviteDistrictTeammate: api.invite }));
const members = ["invited", "removed", "suspended", "unknown"].map((status) => ({
  membership_id: status,
  full_name: `Synthetic ${status}`,
  status,
  role_within_org: "member",
}));
vi.mock("@/components/school/SchoolPageShell", () => ({
  useSchoolDashboard: () => ({
    orgId: "synthetic",
    data: { members: [], pending_members: members },
    loading: false,
    reload: vi.fn(),
    refreshIfCurrent: vi.fn(),
  }),
  SchoolPageShell: ({ children, data }: any) => children({ id: "synthetic" }, data),
}));
vi.mock("@/components/district/DistrictPageShell", () => ({
  useDistrictDashboard: () => ({
    districtId: "synthetic",
    data: { team: [], pending_team: members },
    loading: false,
    reload: vi.fn(),
    refreshIfCurrent: vi.fn(),
  }),
  DistrictPageShell: ({ children, data }: any) => children({ id: "synthetic" }, data),
}));
import { Route as School } from "@/routes/_authenticated/school.team";
import { Route as District } from "@/routes/_authenticated/district.team";
import { isPendingInvitation, membershipStatusLabel } from "@/lib/membership-status";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("School other memberships show recorded status and offer approval only for invitations", () => {
  const Page = School.options.component!;
  render(<Page />);
  expect(screen.getByText("Other Memberships (4)")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Approve" })).toHaveLength(1);
  for (const status of ["removed", "suspended", "unknown"]) {
    const row = screen.getByText(`Synthetic ${status}`).closest("li")!;
    expect(within(row).queryByRole("button", { name: "Approve" })).toBeNull();
    expect(within(row).getByText(membershipStatusLabel(status))).toBeTruthy();
  }
  expect(api.update).not.toHaveBeenCalled();
});
it("District team count describes other memberships and preserves actual statuses", () => {
  const Page = District.options.component!;
  render(<Page />);
  expect(screen.getByText(/0 active.*4 other memberships/)).toBeTruthy();
  for (const label of ["Invited", "Removed", "Suspended", "Status Unavailable"])
    expect(screen.getByText(label)).toBeTruthy();
  expect(api.invite).not.toHaveBeenCalled();
});
it.each(["removed", "suspended", "inactive", "active", undefined])(
  "%s cannot be treated as a pending invitation",
  (status) => {
    expect(isPendingInvitation(status)).toBe(false);
  },
);
it.each(["invited", "pending"])("%s remains an eligible invitation status", (status) => {
  expect(isPendingInvitation(status)).toBe(true);
});
