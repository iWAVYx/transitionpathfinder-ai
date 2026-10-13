// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({
  scope: "original",
  inviteSchool: vi.fn(),
  update: vi.fn(),
  inviteDistrict: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  createFileRoute: () => (options: any) => ({ options }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/components/withRoleGuard", () => ({
  withRoleGuard: (_roles: unknown, page: unknown) => page,
}));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error } }));
vi.mock("@/lib/school-admin.functions", () => ({
  inviteSchoolTeammate: api.inviteSchool,
  updateMembershipStatus: api.update,
}));
vi.mock("@/lib/district-admin.functions", () => ({
  inviteDistrictTeammate: api.inviteDistrict,
  addSchoolToDistrict: api.add,
  removeSchoolFromDistrict: api.remove,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => children,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ open, children }: any) =>
    open ? <div role="alertdialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => children,
  AlertDialogHeader: ({ children }: any) => children,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => children,
  AlertDialogCancel: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock("@/components/school/SchoolPageShell", () => ({
  useSchoolDashboard: () => ({
    orgId: api.scope,
    data: {
      members: [
        {
          membership_id: "member-original",
          full_name: "Synthetic Member",
          email: "fixture@example.invalid",
          role_within_org: "member",
          primary_role: "educator",
          joined_at: "2030-01-01",
        },
      ],
      pending_members: [
        {
          membership_id: "pending-original",
          full_name: "Synthetic Pending",
          role_within_org: "member",
        },
      ],
    },
    loading: false,
    reload: vi.fn(),
    refreshIfCurrent: api.refresh,
  }),
  SchoolPageShell: ({ orgId, data, children }: any) => children({ id: orgId }, data),
}));
vi.mock("@/components/district/DistrictPageShell", () => ({
  useDistrictDashboard: () => ({
    districtId: api.scope,
    data: {
      team: [],
      pending_team: [],
      schools: [
        {
          id: "school-original",
          name: "Synthetic School",
          active_members: 0,
          students_count: 0,
          reports_count: 0,
          open_actions: 0,
        },
      ],
    },
    loading: false,
    reload: vi.fn(),
    refreshIfCurrent: api.refresh,
  }),
  DistrictPageShell: ({ districtId, data, children }: any) => children({ id: districtId }, data),
}));
import { Route as SchoolTeam } from "@/routes/_authenticated/school.team";
import { Route as DistrictTeam } from "@/routes/_authenticated/district.team";
import { Route as DistrictSchools } from "@/routes/_authenticated/district.schools";
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  api.scope = "original";
  for (const value of Object.values(api)) if (typeof value !== "string") value.mockReset();
});
const operations = [
  {
    name: "school invite",
    route: SchoolTeam,
    fn: api.inviteSchool,
    start: () => {
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "fixture@example.invalid" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add Teammate/ }));
    },
    payload: {
      organization_id: "original",
      email: "fixture@example.invalid",
      role_within_org: "member",
    },
  },
  {
    name: "school approval",
    route: SchoolTeam,
    fn: api.update,
    start: () => fireEvent.click(screen.getByRole("button", { name: "Approve" })),
    payload: { membership_id: "pending-original", status: "active" },
  },
  {
    name: "school removal",
    route: SchoolTeam,
    fn: api.update,
    start: () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove", exact: true }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm Access Change" }));
    },
    payload: { membership_id: "member-original", status: "removed" },
  },
  {
    name: "school role change",
    route: SchoolTeam,
    fn: api.update,
    start: () => {
      fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "school_admin" } });
      fireEvent.click(screen.getByRole("button", { name: "Confirm Access Change" }));
    },
    payload: { membership_id: "member-original", role_within_org: "school_admin" },
  },
  {
    name: "district invite",
    route: DistrictTeam,
    fn: api.inviteDistrict,
    start: () => {
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "fixture@example.invalid" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Invite", exact: true }));
    },
    payload: {
      district_id: "original",
      email: "fixture@example.invalid",
      role_within_org: "member",
    },
  },
  {
    name: "district school add",
    route: DistrictSchools,
    fn: api.add,
    start: () => {
      fireEvent.change(screen.getByLabelText("School Name"), {
        target: { value: "Synthetic New School" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add", exact: true }));
    },
    payload: { district_id: "original", new_school_name: "Synthetic New School" },
  },
  {
    name: "district school unlink",
    route: DistrictSchools,
    fn: api.remove,
    start: () => fireEvent.click(screen.getByRole("button", { name: /Unlink/ })),
    payload: { district_id: "original", school_id: "school-original" },
  },
];
for (const operation of operations)
  describe(operation.name, () => {
    it.each([false, true])(
      "completion after a context switch stays silent and never refreshes (%s)",
      async (failure) => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        const pending = deferred();
        operation.fn.mockReturnValue(pending.promise);
        const Page = operation.route.options.component as any;
        const view = render(<Page />);
        operation.start();
        await waitFor(() => expect(operation.fn).toHaveBeenCalledOnce());
        expect(operation.fn.mock.calls[0][0].data).toMatchObject(operation.payload);
        api.scope = "current";
        view.rerender(<Page />);
        await act(async () =>
          failure ? pending.reject(new Error("Departed operation")) : pending.resolve({}),
        );
        expect(api.refresh).not.toHaveBeenCalled();
        expect(api.success).not.toHaveBeenCalled();
        expect(api.error).not.toHaveBeenCalled();
      },
    );
    it("a completion in the active context still refreshes", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      operation.fn.mockResolvedValue({});
      const Page = operation.route.options.component as any;
      render(<Page />);
      operation.start();
      await waitFor(() => expect(api.refresh).toHaveBeenCalledOnce());
      expect(api.error).not.toHaveBeenCalled();
    });
  });
