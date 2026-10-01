// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";

import {
  useDemoSchool,
  useDemoDistrict,
  useDemoPartnerPlan,
} from "../../src/lib/demo/use-role-context";
function PlanningPage() {
  const { schoolId, setSchool } = useDemoSchool();
  const { districtId, setDistrict } = useDemoDistrict();
  const { planId, setPlan } = useDemoPartnerPlan();
  return (
    <>
      <output data-testid="context">
        {schoolId}:{districtId}:{planId}
      </output>
      <button onClick={() => setSchool("specialized")}>School</button>
      <button onClick={() => setDistrict("local-district")}>District</button>
      <button onClick={() => setPlan("premium")}>Plan</button>
    </>
  );
}

function open(entry: string) {
  const root = createRootRoute();
  const route = createRoute({
    getParentRoute: () => root,
    path: "/demo/$role",
    component: PlanningPage,
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: [entry] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

describe("demo organization history", () => {
  for (const [role, param, initial, next, button] of [
    ["school-admin", "school", "comprehensive", "specialized", "School"],
    ["district-admin", "district", "regional-network", "local-district", "District"],
    ["partner", "plan", "free", "premium", "Plan"],
  ]) {
    it(`restores ${role} through history without losing query/hash`, async () => {
      const router = open(`/demo/${role}?${param}=${initial}&expand=true#widgets`);
      await waitFor(() => expect(screen.getByTestId("context").textContent).toContain(initial));
      fireEvent.click(screen.getByRole("button", { name: button }));
      await waitFor(() => expect(router.state.location.search[param]).toBe(next));
      router.history.back();
      await waitFor(() => expect(router.state.location.search[param]).toBe(initial));
      await waitFor(() => expect(screen.getByTestId("context").textContent).toContain(initial));
      router.history.forward();
      await waitFor(() => expect(screen.getByTestId("context").textContent).toContain(next));
      expect(router.state.location.search.expand).toBe(true);
      expect(router.state.location.hash).toBe("widgets");
    });
  }
  it("pins missing organization context without adding an unrelated selector", async () => {
    const router = open("/demo/school-admin");
    await waitFor(() => expect(router.state.location.search.school).toBeDefined());
    expect(router.state.location.search.district).toBeUndefined();
    expect(router.state.location.search.plan).toBeUndefined();
  });
});
