// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
const api = vi.hoisted(() => ({
  planning: vi.fn(),
  resources: vi.fn(),
  support: vi.fn(),
  schoolTrends: vi.fn(),
  districtTrends: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("sonner", () => ({ toast: { error: api.error } }));
vi.mock("@/lib/school-insights.functions", () => ({
  getSchoolPlanningStatus: api.planning,
  getSchoolResourceUsage: api.resources,
  getSchoolSupportNeeds: api.support,
  getSchoolReadinessTrends: api.schoolTrends,
  getDistrictReadinessTrends: api.districtTrends,
}));
vi.mock("@/lib/route-role-guard", () => ({ ensureRoleAccess: vi.fn() }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => children }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/school/SchoolNav", () => ({ SchoolNav: () => null }));
vi.mock("@/components/district/DistrictPageShell", async () => {
  const { useRouterState } = await import("@tanstack/react-router");
  return {
    useDistrictDashboard: () => {
      const id = useRouterState({ select: (state) => (state.location.search as any).district_id });
      return {
        districtId: id,
        data: { selected_district_id: id },
        loading: false,
        reload: vi.fn(),
      };
    },
    DistrictPageShell: ({ children }: any) => children(),
  };
});
import { Route as Planning } from "@/routes/_authenticated/school.planning-status";
import { Route as Resources } from "@/routes/_authenticated/school.resource-usage";
import { Route as Support } from "@/routes/_authenticated/school.support-needs";
import { Route as SchoolTrends } from "@/routes/_authenticated/school.readiness-trends";
import { Route as DistrictTrends } from "@/routes/_authenticated/district.readiness-trends";
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
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
  Object.values(api).forEach((fn) => fn.mockReset());
});
async function open(route: any, path: string, key: string, id = A) {
  const root = createRootRoute();
  const page = createRoute({
    getParentRoute: () => root,
    path,
    validateSearch: route.options.validateSearch,
    search: route.options.search,
    component: route.options.component,
  });
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [path + `?${key}=${id}`] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}
const pages = [
  { name: "planning status", path: "/school/planning-status", route: Planning, fn: api.planning },
  { name: "resource usage", path: "/school/resource-usage", route: Resources, fn: api.resources },
  { name: "support needs", path: "/school/support-needs", route: Support, fn: api.support },
  {
    name: "school readiness",
    path: "/school/readiness-trends",
    route: SchoolTrends,
    fn: api.schoolTrends,
  },
];
for (const page of pages)
  describe(page.name, () => {
    it.each([false, true])(
      "uses URL organization and ignores old scope completion (%s)",
      async (failure) => {
        const old = deferred();
        page.fn
          .mockReturnValueOnce(old.promise)
          .mockResolvedValue({ org_id: B, is_school_admin: false, is_admin: false });
        const router = await open(page.route, page.path, "org_id");
        await waitFor(() => expect(page.fn).toHaveBeenCalledOnce());
        expect(page.fn.mock.calls[0][0]).toEqual({ data: { org_id: A } });
        await act(async () => router.navigate({ to: page.path, search: { org_id: B } }));
        await waitFor(() => expect(page.fn).toHaveBeenCalledTimes(2));
        expect(page.fn.mock.calls[1][0]).toEqual({ data: { org_id: B } });
        await act(async () =>
          failure
            ? old.reject(new Error("Private old scope"))
            : old.resolve({ org_id: A, is_school_admin: false, is_admin: false }),
        );
        expect(api.error).not.toHaveBeenCalled();
        expect(screen.queryByRole("alert")).toBeNull();
        expect((router.state.location.search as any).org_id).toBe(B);
      },
    );
    it("a current load failure shows retry instead of a no-access claim", async () => {
      page.fn.mockRejectedValue(new Error("Private backend detail"));
      await open(page.route, page.path, "org_id");
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("could not be loaded");
      expect(alert.textContent).not.toContain("Private backend detail");
      expect(screen.getByRole("button", { name: "Retry", exact: true })).toBeTruthy();
    });
  });
it("District readiness uses the resolved district and displays no invented school scores", async () => {
  api.districtTrends.mockImplementation(async ({ data }: any) => ({
    org_id: data.district_id,
    is_admin: true,
    scope: "district",
    total_students: 0,
    scored_students: 0,
    pillar_averages: [],
  }));
  const router = await open(DistrictTrends, "/district/readiness-trends", "district_id");
  await waitFor(() => expect(api.districtTrends).toHaveBeenCalledOnce());
  expect(api.districtTrends.mock.calls[0][0]).toEqual({ data: { district_id: A } });
  expect(screen.getByText(/School-level readiness comparisons are not available/)).toBeTruthy();
  expect(screen.queryByText("Hartford Regional HS")).toBeNull();
  expect(screen.queryByText("Bridgeport Regional HS")).toBeNull();
  await act(async () =>
    router.navigate({ to: "/district/readiness-trends", search: { district_id: B } }),
  );
  await waitFor(() =>
    expect(api.districtTrends.mock.calls.at(-1)?.[0]).toEqual({ data: { district_id: B } }),
  );
});


it.each([true, false])("Support Needs distinguishes an explicit total from a legacy preview (total=%s)", async known => {
  api.support.mockResolvedValue({
    org_id: A, is_school_admin: true, total_students: 600,
    ...(known ? { total_needing_support: 63 } : {}),
    needing_support: [{ student_id: "synthetic-student", first_name: "Synthetic Student", preferred_name: null, grade_band: "11", owner_name: null, avg_score: 45, weakest_category: "employment", weakest_score: 45, has_report: false }],
  });
  await open(Support, "/school/support-needs", "org_id");
  await screen.findByText("Synthetic Student");
  expect(screen.getByRole("heading", { name: known ? "63 of 600 Students Flagged" : "1 Student Shown" })).toBeTruthy();
  if (known) expect(screen.getByText("Showing 1 of 63 flagged students, ordered by support need.")).toBeTruthy();
  else expect(screen.queryByText(/Showing .* flagged students/)).toBeNull();
});
