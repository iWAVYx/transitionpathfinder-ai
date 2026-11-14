// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Link,
} from "@tanstack/react-router";
const api = vi.hoisted(() => ({ school: vi.fn(), district: vi.fn(), error: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("sonner", () => ({ toast: { error: api.error } }));
vi.mock("@/lib/school-admin.functions", () => ({
  getSchoolDashboard: api.school,
  createSchoolForAdmin: vi.fn(),
}));
vi.mock("@/lib/district-admin.functions", () => ({
  getDistrictDashboard: api.district,
  createDistrict: vi.fn(),
}));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: () => null }));
vi.mock("@/components/site/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/site/SiteFooter", () => ({ SiteFooter: () => null }));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: () => null }));
import { useSchoolDashboard } from "@/components/school/SchoolPageShell";
import { useDistrictDashboard } from "@/components/district/DistrictPageShell";
import { OrganizationLoadError } from "@/components/dashboard/OrganizationLoadError";
import {
  schoolDashboardNavigation,
  districtDashboardNavigation,
} from "@/lib/organization-dashboard-navigation";
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
for (const role of ["school", "district"] as const)
  describe(`${role} actual dashboard URL selection`, () => {
    const key = role === "school" ? "org_id" : "district_id";
    const fetch = api[role];
    const dashboard = (id: string) => ({ [`selected_${key}`]: id, label: id });
    const useDashboard = role === "school" ? useSchoolDashboard : useDistrictDashboard;
    const options = role === "school" ? schoolDashboardNavigation : districtDashboardNavigation;
    let reader: ReturnType<typeof useSchoolDashboard> | ReturnType<typeof useDistrictDashboard>;
    function Page() {
      reader = useDashboard();
      return (
        <>
          <output data-testid="data">{JSON.stringify(reader.data)}</output>
          <output data-testid="loading">{String(reader.loading)}</output>
          {!reader.loading && !reader.data && (
            <OrganizationLoadError
              onRetry={() => void reader.reload()}
              onRecoverSelection={reader.recoverSelection}
            />
          )}
          <button onClick={() => void reader.reload(B)}>Select Second</button>
          <Link to={`/${role}/team`}>Tool</Link>
          <Link to={`/${role}/overview`}>Dashboard</Link>
          <Link to="/owner">Owner</Link>
        </>
      );
    }
    async function open(entry: string) {
      const root = createRootRoute();
      const routes = ["overview", "team"].map((page) =>
        createRoute({
          getParentRoute: () => root,
          path: `/${role}/${page}`,
          ...options,
          component: () => <Page key={page} />,
        }),
      );
      routes.push(
        createRoute({
          getParentRoute: () => root,
          path: "/owner",
          component: () => <p>Owner Management</p>,
        }) as any,
      );
      const history = createMemoryHistory({ initialEntries: [entry] });
      const router = createRouter({ routeTree: root.addChildren(routes), history });
      await router.load();
      render(<RouterProvider router={router} />);
      await screen.findByTestId("data");
      return { router, history };
    }
    it("pins the default without a new history entry and preserves search/hash", async () => {
      fetch.mockResolvedValue(dashboard(A));
      const { router, history } = await open(`/${role}/overview?filter=open#reports`);
      await waitFor(() => expect((router.state.location.search as any)[key]).toBe(A));
      expect(router.state.location.hash).toBe("reports");
      expect((router.state.location.search as any).filter).toBe("open");
      expect(history.length).toBe(1);
      expect(fetch).toHaveBeenCalledOnce();
    });
    it("tool navigation, refresh and back/forward restore each selection", async () => {
      fetch.mockImplementation(async ({ data }: any) => dashboard(data[key] ?? A));
      const { router, history } = await open(`/${role}/overview?${key}=${A}#reports`);
      await waitFor(() => expect(screen.getByTestId("data").textContent).toContain(A));
      fireEvent.click(screen.getByRole("button", { name: "Select Second" }));
      await waitFor(() => expect(screen.getByTestId("data").textContent).toContain(B));
      expect(router.state.location.hash).toBe("reports");
      expect(history.length).toBe(2);
      await act(async () => reader.reload());
      expect(fetch.mock.calls.at(-1)?.[0]).toEqual({ data: { [key]: B } });
      fireEvent.click(screen.getByRole("link", { name: "Tool", exact: true }));
      await waitFor(() => expect(router.state.location.pathname).toBe(`/${role}/team`));
      await waitFor(() => expect(screen.getByTestId("data").textContent).toContain(B));
      expect((router.state.location.search as any)[key]).toBe(B);
      await act(async () => history.back());
      await waitFor(() => expect(router.state.location.pathname).toBe(`/${role}/overview`));
      await act(async () => history.back());
      await waitFor(() => expect(screen.getByTestId("data").textContent).toContain(A));
      await act(async () => history.forward());
      await waitFor(() => expect(screen.getByTestId("data").textContent).toContain(B));
    });
    it.each([false, true])(
      "late selection loads cannot replace history's selection (%s)",
      async (failure) => {
        const old = deferred();
        fetch.mockReturnValueOnce(old.promise).mockResolvedValue(dashboard(B));
        const { router } = await open(`/${role}/overview?${key}=${A}`);
        await act(async () => router.navigate({ to: `/${role}/overview`, search: { [key]: B } }));
        await waitFor(() => expect(screen.getByTestId("data").textContent).toContain(B));
        await act(async () =>
          failure ? old.reject(new Error("Old detail")) : old.resolve(dashboard(A)),
        );
        expect(screen.getByTestId("data").textContent).toContain(B);
        expect(api.error).not.toHaveBeenCalled();
      },
    );
    it("an unavailable explicit organization cannot silently display another one", async () => {
      fetch.mockResolvedValue(dashboard(A));
      await open(`/${role}/overview?${key}=${B}`);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
      expect(screen.getByTestId("data").textContent).toBe("null");
      expect(api.error).toHaveBeenCalledExactlyOnceWith(`Could not load ${role} data.`);
    });
    it("explicit recovery clears only the role selection and preserves hash/search/history", async () => {
      fetch.mockResolvedValue(dashboard(A));
      const { router, history } = await open(
        `/${role}/overview?${key}=${B}&filter=open&preserved=keep#reports`,
      );
      await screen.findByRole("button", { name: "Load an Available Workspace", exact: true });
      expect(screen.getByTestId("data").textContent).toBe("null");
      expect(fetch).toHaveBeenCalledOnce();
      fireEvent.click(
        screen.getByRole("button", { name: "Load an Available Workspace", exact: true }),
      );
      await waitFor(() => expect(screen.getByTestId("data").textContent).toContain(A));
      expect(fetch.mock.calls[1][0]).toEqual({ data: { [key]: undefined } });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect((router.state.location.search as any)[key]).toBe(A);
      expect((router.state.location.search as any).filter).toBe("open");
      expect((router.state.location.search as any).preserved).toBe("keep");
      expect(router.state.location.hash).toBe("reports");
      expect(history.length).toBe(2);
      await act(async () => history.back());
      await waitFor(() => expect((router.state.location.search as any)[key]).toBe(B));
      await screen.findByRole("button", { name: "Load an Available Workspace", exact: true });
      expect(screen.getByTestId("data").textContent).toBe("null");
    });
    it("a failed default load stays a retryable error without recovery loops or stale rows", async () => {
      fetch
        .mockResolvedValueOnce(dashboard(A))
        .mockRejectedValue(new Error("Private default error"));
      const { router } = await open(`/${role}/overview?${key}=${B}#reports`);
      fireEvent.click(
        await screen.findByRole("button", { name: "Load an Available Workspace", exact: true }),
      );
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
      expect(screen.getByTestId("data").textContent).toBe("null");
      expect(screen.getByRole("alert").textContent).not.toContain("Private default error");
      expect(
        screen.queryByRole("button", { name: "Load an Available Workspace", exact: true }),
      ).toBeNull();
      expect((router.state.location.search as any)[key]).toBeUndefined();
      expect(router.state.location.hash).toBe("reports");
    });
    it("a departed recovery callback cannot change Owner navigation or start a read", async () => {
      fetch.mockResolvedValue(dashboard(A));
      const { router } = await open(`/${role}/overview?${key}=${B}`);
      await screen.findByRole("button", { name: "Load an Available Workspace", exact: true });
      const recover = reader.recoverSelection!;
      fireEvent.click(screen.getByRole("link", { name: "Owner", exact: true }));
      await screen.findByText("Owner Management");
      const calls = fetch.mock.calls.length;
      await act(async () => recover());
      expect(router.state.location.pathname).toBe("/owner");
      expect((router.state.location.search as any)[key]).toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(calls);
    });
    it("an old save callback cannot select or reload its departed organization", async () => {
      fetch.mockImplementation(async ({ data }: any) => dashboard(data[key] ?? A));
      await open(`/${role}/overview?${key}=${A}`);
      await waitFor(() => expect(screen.getByTestId("data").textContent).toContain(A));
      const oldRefresh = reader.refreshIfCurrent;
      fireEvent.click(screen.getByRole("button", { name: "Select Second" }));
      await waitFor(() => expect(screen.getByTestId("data").textContent).toContain(B));
      const count = fetch.mock.calls.length;
      await act(async () => oldRefresh(A));
      expect(fetch).toHaveBeenCalledTimes(count);
      await act(async () => reader.refreshIfCurrent(B));
      expect(fetch).toHaveBeenCalledTimes(count + 1);
    });
    it("departing for Owner never pins organizational context onto that destination", async () => {
      const pending = deferred();
      fetch.mockReturnValue(pending.promise);
      const { router } = await open(`/${role}/overview`);
      fireEvent.click(screen.getByRole("link", { name: "Owner", exact: true }));
      await screen.findByText("Owner Management");
      await act(async () => pending.resolve(dashboard(A)));
      expect(router.state.location.pathname).toBe("/owner");
      expect((router.state.location.search as any)[key]).toBeUndefined();
      expect(api.error).not.toHaveBeenCalled();
    });
  });

it("malformed organization IDs are rejected while unrelated search fields are retained", () => {
  expect(() => schoolDashboardNavigation.validateSearch({ org_id: "broken" })).toThrow();
  expect(() => districtDashboardNavigation.validateSearch({ district_id: "broken" })).toThrow();
  expect(schoolDashboardNavigation.validateSearch({ org_id: A, filter: "open" })).toEqual({
    org_id: A,
    filter: "open",
  });
});
