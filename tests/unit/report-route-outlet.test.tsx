// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter,
} from "@tanstack/react-router";

const mocks = vi.hoisted(() => ({ list: vi.fn(), guard: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/pathway.functions", () => ({ listMyReports: mocks.list, deleteReport: vi.fn() }));
vi.mock("@/components/RoleGuard", () => ({
  RoleGuard: ({ children, path }: any) => { mocks.guard(path); return children; },
}));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
import { Route } from "../../src/routes/_authenticated/reports";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({ reports: [{
    id: "synthetic-report", student_first_name: "Synthetic learner",
    summary: "Synthetic report summary", created_at: "2026-10-03T12:00:00Z",
    student_id: null, linked_student_name: null, grade_band: null,
  }] });
});

async function mountAt(path: string) {
  const root = createRootRoute({ component: Outlet });
  const library = createRoute({
    getParentRoute: () => root, path: "reports", component: Route.options.component,
  });
  const detail = createRoute({
    getParentRoute: () => library, path: "$reportId",
    component: () => <h1 data-testid="pathway-report-page">Individual report</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([library.addChildren([detail])]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}

describe("shared report library/detail routing", () => {
  it("renders a directly opened report without mounting the library", async () => {
    await mountAt("/reports/synthetic-report");
    expect(await screen.findByTestId("pathway-report-page")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "My Pathway Reports" })).toBeNull();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.guard).not.toHaveBeenCalled();
  });

  it("opens a report from the guarded library and restores the library on Back", async () => {
    const router = await mountAt("/reports");
    expect(await screen.findByRole("heading", { name: "My Pathway Reports" })).toBeTruthy();
    expect(mocks.guard).toHaveBeenCalledWith("/reports");
    fireEvent.click(await screen.findByRole("link", { name: "Open" }));
    expect(await screen.findByTestId("pathway-report-page")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "My Pathway Reports" })).toBeNull();
    await act(async () => { router.history.back(); });
    expect(await screen.findByRole("heading", { name: "My Pathway Reports" })).toBeTruthy();
  });
});
