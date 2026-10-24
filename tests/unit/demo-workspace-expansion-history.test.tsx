// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider, useRouterState } from "@tanstack/react-router";
import { getDemoProfile } from "@/lib/demo/demo-profiles";
const context = vi.hoisted(() => ({ role: "family" }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@/components/demo/DemoRoleLens", () => ({ DemoRoleLens: () => null }));
vi.mock("@/components/demo/StudentSwitcher", () => ({ StudentSwitcher: () => null }));
vi.mock("@/components/demo/WorkspaceRolePerspective", () => ({ WorkspaceRolePerspective: () => null }));
vi.mock("@/components/demo/DemoPathwayBuilder", () => ({ DemoPathwayBuilder: () => null }));
vi.mock("@/lib/demo/use-demo-student", () => ({ useDemoStudent: () => ({ profile: getDemoProfile("sam") }) }));
vi.mock("@/lib/demo/use-demo-planning-role", () => ({ useDemoPlanningRole: () => ({ role: context.role, setRole: vi.fn() }) }));
vi.mock("@/components/workspace", () => ({
  WorkspaceShell: ({ children }: any) => children,
  StageBody: ({ expanded, onExpandChange }: any) => <><output>{expanded ? "Expanded" : "Collapsed"}</output><button onClick={() => onExpandChange(!expanded)}>Toggle Sample</button></>,
}));
import { Route } from "@/routes/demo_.workspace.$stage";
afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); });
it.each(["student", "family", "educator"])("%s sample expansion preserves the section, role and student through history", async role => {
  context.role = role;
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(Route, "useParams").mockReturnValue({ stage: "voice" });
  vi.spyOn(Route, "useSearch").mockImplementation(() => useRouterState({ select: state => state.location.search }) as any);
  const root = createRootRoute();
  const page = createRoute({ getParentRoute: () => root, path: "/demo/workspace/$stage", component: Route.options.component });
  const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: [`/demo/workspace/voice?role=${role}&student=sam#sample-voice`] }) });
  await router.load(); render(<RouterProvider router={router} />);
  await screen.findByText("Collapsed");
  const navigate = vi.spyOn(router, "navigate");
  fireEvent.click(screen.getByRole("button", { name: "Toggle Sample" }));
  await screen.findByText("Expanded");
  expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ hash: "sample-voice", resetScroll: false, replace: false }));
  expect(router.state.location.search).toMatchObject({ role, student: "sam", expand: true });
  expect(router.state.location.hash).toBe("sample-voice");
  fireEvent.click(screen.getByRole("button", { name: "Toggle Sample" }));
  await screen.findByText("Collapsed");
  expect(router.state.location.search.expand).toBeUndefined();
  expect(router.state.location.hash).toBe("sample-voice");
  router.history.back();
  await waitFor(() => expect(screen.getByText("Expanded")).toBeTruthy());
  router.history.forward();
  await waitFor(() => expect(screen.getByText("Collapsed")).toBeTruthy());
  expect(router.state.location.search).toMatchObject({ role, student: "sam" });
});
