// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  useRouterState,
} from "@tanstack/react-router";
const api = vi.hoisted(() => ({ read: vi.fn(), roles: vi.fn() }));
vi.mock("@/lib/profile.functions", () => ({ getMyRoles: api.roles }));
import { ensureRoleAccess } from "@/lib/route-role-guard";
import {
  schoolDashboardNavigation,
  districtDashboardNavigation,
} from "@/lib/organization-dashboard-navigation";
import { organizationRouteErrorComponent } from "@/components/routing/OrganizationRouteError";
import { useOrganizationDashboardSelection } from "@/hooks/use-organization-dashboard-selection";
import { OrganizationLoadError } from "@/components/dashboard/OrganizationLoadError";
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const routes = [
  ...[
    "calendar",
    "implementation",
    "overview",
    "planning-status",
    "readiness-trends",
    "reports",
    "resource-usage",
    "support-needs",
    "team",
  ].map((tool) => ({ scope: "school" as const, path: `/school/${tool}` })),
  ...[
    "implementation",
    "overview",
    "progress",
    "readiness-trends",
    "reports",
    "schools",
    "service-gaps",
    "team",
  ].map((tool) => ({ scope: "district" as const, path: `/district/${tool}` })),
  { scope: "school" as const, path: "/hubs/school" },
  { scope: "district" as const, path: "/hubs/district" },
];
afterEach(() => {
  cleanup();
  api.read.mockReset();
  api.roles.mockReset();
});
async function open(
  scope: "school" | "district",
  path: string,
  query: Record<string, string>,
  options: { failure?: boolean; guard?: boolean } = {},
) {
  const root = createRootRoute();
  const nav = scope === "school" ? schoolDashboardNavigation : districtDashboardNavigation;
  function Probe() {
    const reader = useOrganizationDashboardSelection(
      scope,
      api.read,
      (data: { organization_id: string }) => data.organization_id,
      "Workspace could not be loaded.",
    );
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    if (reader.loading) return <p>Loading Scoped Reader</p>;
    if (!reader.data)
      return (
        <OrganizationLoadError
          onRetry={() => void reader.reload()}
          onRecoverSelection={reader.recoverSelection}
        />
      );
    return <div>Scoped Reader Ready at {pathname}</div>;
  }
  const fallback = () => <div>Original Route Fallback</div>;
  const page = createRoute({
    getParentRoute: () => root,
    path,
    ...nav,
    errorComponent: organizationRouteErrorComponent(scope, path, fallback),
    beforeLoad: options.failure
      ? () => {
          throw new Error("Synthetic route failure");
        }
      : options.guard
        ? () => ensureRoleAccess([scope === "school" ? "school_admin" : "district_admin", "admin"])
        : undefined,
    component: Probe,
  });
  const dashboard = createRoute({
    getParentRoute: () => root,
    path: "/dashboard",
    component: () => <div>Permitted Dashboard</div>,
  });
  const router = createRouter({
    routeTree: root.addChildren([page, dashboard]),
    history: createMemoryHistory({
      initialEntries: [`${path}?${new URLSearchParams(query)}#kept`],
    }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}
for (const { scope, path } of routes) {
  it(`${path} is wired and recovers only its malformed workspace selection`, async () => {
    const source = readFileSync(
      resolve(process.cwd(), `src/routes/_authenticated/${path.slice(1).replaceAll("/", ".")}.tsx`),
      "utf8",
    );
    expect(source).toContain(`...${scope}DashboardNavigation`);
    expect(source).toContain(`organizationRouteErrorComponent("${scope}", "${path}"`);
    if (path === "/school/calendar" || path === "/school/overview" || path === "/district/overview")
      expect(source).toContain(`dashboardErrorComponent("${scope}_admin")`);
    api.read.mockResolvedValue({ organization_id: A });
    const key = scope === "school" ? "org_id" : "district_id";
    const router = await open(scope, path, {
      [key]: "malformed-private-value",
      student_id: B,
      filter: "saved",
      range: "week",
    });
    await screen.findByText("This Saved Link Needs Updating");
    expect(screen.queryByText("malformed-private-value")).toBeNull();
    expect(api.read).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear Invalid Selections" }));
    await screen.findByText(`Scoped Reader Ready at ${path}`);
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        [key]: A,
        student_id: B,
        filter: "saved",
        range: "week",
      }),
    );
    expect(api.read).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(router.state.location.pathname).toBe(path);
    expect(router.state.location.hash).toBe("kept");
    expect(router.history.length).toBe(1);
  });
}
it.each(["school", "district"] as const)(
  "%s recovery does not turn failed default loading into an automatic fallback loop",
  async (scope) => {
    api.read.mockRejectedValue(new Error("Private backend detail"));
    const key = scope === "school" ? "org_id" : "district_id";
    const router = await open(scope, `/${scope}/overview`, { [key]: "bad" });
    await screen.findByText("This Saved Link Needs Updating");
    fireEvent.click(screen.getByRole("button", { name: "Clear Invalid Selections" }));
    await screen.findByRole("alert");
    expect(api.read).toHaveBeenCalledOnce();
    expect(router.state.location.search[key]).toBeUndefined();
    expect(screen.queryByText("Private backend detail")).toBeNull();
    expect(screen.queryByText(/Scoped Reader Ready/)).toBeNull();
    expect(screen.getByRole("button", { name: "Retry", exact: true })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load an Available Workspace" })).toBeNull();
  },
);
it.each(["school", "district"] as const)(
  "%s ignores malformed fields owned by another scope",
  async (scope) => {
    api.read.mockResolvedValue({ organization_id: A });
    const key = scope === "school" ? "org_id" : "district_id";
    const other = scope === "school" ? "district_id" : "org_id";
    const router = await open(scope, `/${scope}/reports`, {
      [key]: A,
      [other]: "other-scope-invalid",
      student_id: "not-a-workspace-field",
    });
    await screen.findByText(/Scoped Reader Ready/);
    expect(api.read).toHaveBeenCalledExactlyOnceWith(A);
    expect(router.state.location.search[other]).toBe("other-scope-invalid");
    expect(screen.queryByRole("button", { name: "Clear Invalid Selections" })).toBeNull();
  },
);
it.each(["school", "district"] as const)(
  "%s valid unavailable selection retains explicit available-workspace recovery",
  async (scope) => {
    api.read.mockResolvedValue({ organization_id: A });
    const key = scope === "school" ? "org_id" : "district_id";
    const router = await open(scope, `/${scope}/reports`, { [key]: B });
    await screen.findByRole("alert");
    expect(router.state.location.search[key]).toBe(B);
    expect(api.read).toHaveBeenCalledExactlyOnceWith(B);
    expect(screen.queryByRole("button", { name: "Clear Invalid Selections" })).toBeNull();
    expect(screen.getByRole("button", { name: "Load an Available Workspace" })).toBeTruthy();
  },
);
it.each(["school", "district"] as const)(
  "%s preserves its prior fallback on an unrelated route failure",
  async (scope) => {
    await open(scope, `/${scope}/overview`, {}, { failure: true });
    await screen.findByText("Original Route Fallback");
    expect(api.read).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Clear Invalid Selections" })).toBeNull();
  },
);
it.each(["school", "district"] as const)(
  "%s explicit recovery still runs the actual beforeLoad role policy",
  async (scope) => {
    api.roles.mockResolvedValue({ roles: [`${scope}_admin`] });
    const key = scope === "school" ? "org_id" : "district_id";
    const router = await open(scope, `/${scope}/overview`, { [key]: "bad" }, { guard: true });
    await screen.findByText("This Saved Link Needs Updating");
    const initialChecks = api.roles.mock.calls.length;
    expect(initialChecks).toBeGreaterThan(0);
    api.roles.mockResolvedValue({ roles: ["student"] });
    fireEvent.click(screen.getByRole("button", { name: "Clear Invalid Selections" }));
    await screen.findByText("Permitted Dashboard");
    expect(router.state.location.pathname).toBe("/dashboard");
    expect(api.roles.mock.calls.length).toBeGreaterThan(initialChecks);
    expect(api.read).not.toHaveBeenCalled();
  },
);

it.each(["school", "district"] as const)(
  "%s initial incompatible role is denied even with a malformed link",
  async (scope) => {
    api.roles.mockResolvedValue({ roles: ["student"] });
    const key = scope === "school" ? "org_id" : "district_id";
    const router = await open(scope, `/${scope}/overview`, { [key]: "bad" }, { guard: true });
    await screen.findByText("Permitted Dashboard");
    expect(router.state.location.pathname).toBe("/dashboard");
    expect(api.read).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Clear Invalid Selections" })).toBeNull();
  },
);
