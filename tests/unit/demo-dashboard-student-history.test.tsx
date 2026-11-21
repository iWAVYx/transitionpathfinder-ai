// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider, Link } from "@tanstack/react-router";
import { useDemoStudent } from "../../src/lib/demo/use-demo-student";
import { useDemoDashboardStudent } from "../../src/lib/demo/use-demo-dashboard-student";
import type { DemoRoleId } from "../../src/lib/demo/role-previews";
function Dashboard({ role }: { role: DemoRoleId }) {
  const { profile, hydrated } = useDemoStudent();
  useDemoDashboardStudent(role, profile.id, hydrated);
  return <><output data-testid="student">{profile.id}</output><Link to={`/demo/feature/${role}/calendar`} search={{ student: profile.id }}>Open Calendar</Link></>;
}
function open(role: DemoRoleId, entry: string) {
  const root = createRootRoute();
  const overview = createRoute({ getParentRoute: () => root, path: "/demo", component: () => <h1>Overview</h1> });
  const dashboard = createRoute({ getParentRoute: () => root, path: `/demo/${role}`, component: () => <Dashboard role={role} /> });
  const feature = createRoute({ getParentRoute: () => root, path: `/demo/feature/${role}/calendar`, component: () => <h1>Calendar</h1> });
  const history = createMemoryHistory({ initialEntries: ["/demo", entry] });
  const router = createRouter({ routeTree: root.addChildren([overview, dashboard, feature]), history });
  render(<RouterProvider router={router} />);
  return router;
}
beforeEach(() => localStorage.clear());
afterEach(cleanup);
it.each(["student", "family", "educator"] as DemoRoleId[])("pins implicit %s student context without adding history or losing the section", async role => {
  localStorage.setItem("tf.demo.selectedStudent", "sam");
  const router = open(role, `/demo/${role}?source=tour#widgets`);
  await waitFor(() => expect(router.state.location.search).toEqual({ source: "tour", student: "sam" }));
  expect(router.state.location.hash).toBe("widgets");
  expect(screen.getByTestId("student").textContent).toBe("sam");
  fireEvent.click(screen.getByRole("link", { name: "Open Calendar" }));
  await screen.findByRole("heading", { name: "Calendar" });
  expect(router.state.location.search).toEqual({ student: "sam" });
  router.history.back();
  await screen.findByTestId("student");
  expect(router.state.location.search).toEqual({ source: "tour", student: "sam" });
  router.history.back();
  await screen.findByRole("heading", { name: "Overview" });
});
it("uses the default student when no preference is stored", async () => {
  const router = open("family", "/demo/family");
  await waitFor(() => expect(router.state.location.search).toEqual({ student: "jordan" }));
});
it("preserves an explicit URL student instead of the stored preference", async () => {
  localStorage.setItem("tf.demo.selectedStudent", "sam");
  const router = open("family", "/demo/family?student=riley#widgets");
  await waitFor(() => expect(screen.getByTestId("student").textContent).toBe("riley"));
  expect(router.state.location.search).toEqual({ student: "riley" });
  expect(router.state.location.hash).toBe("widgets");
});
it("leaves organization demo context to its existing role-specific hooks", async () => {
  const router = open("school-admin", "/demo/school-admin?school=specialized");
  await screen.findByTestId("student");
  expect(router.state.location.search).toEqual({ school: "specialized" });
});
