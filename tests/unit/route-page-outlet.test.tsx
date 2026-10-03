// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter, redirect,
} from "@tanstack/react-router";
import { RoutePageOutlet } from "../../src/components/RoutePageOutlet";

const landingRender = vi.fn();
function Landing() { landingRender(); return <h1>Landing page</h1>; }
afterEach(cleanup);
beforeEach(() => {
  landingRender.mockClear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

async function mount(parent: string, child: string, initial: string, denied = false) {
  const root = createRootRoute({ component: Outlet });
  const landing = createRoute({
    getParentRoute: () => root, path: parent,
    beforeLoad: () => { if (denied) throw redirect({ to: "/denied" }); },
    component: () => <RoutePageOutlet><Landing /></RoutePageOutlet>,
  });
  const detail = createRoute({
    getParentRoute: () => landing, path: child,
    component: () => <h1>Detail page</h1>,
  });
  const deniedRoute = createRoute({ getParentRoute: () => root, path: "denied", component: () => <h1>Access denied</h1> });
  const router = createRouter({
    routeTree: root.addChildren([landing.addChildren([detail]), deniedRoute]),
    history: createMemoryHistory({ initialEntries: [initial] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}

describe("parent pages with nested tools", () => {
  it.each([
    ["pathway", "family", "/pathway/family"],
    ["pathway", "student", "/pathway/student"],
    ["documents", "$documentId/review", "/documents/synthetic/review"],
    ["forms", "$slug", "/forms/synthetic"],
    ["meetings", "$meetingId", "/meetings/synthetic"],
    ["admin", "orgs", "/admin/orgs"],
    ["blog", "$slug", "/blog/synthetic"],
    ["partnerforward", "incentives", "/partnerforward/incentives"],
  ])("opens %s/%s without mounting the landing page", async (parent, child, initial) => {
    await mount(parent, child, initial);
    expect(await screen.findByRole("heading", { name: "Detail page" })).toBeTruthy();
    expect(landingRender).not.toHaveBeenCalled();
  });

  it("preserves the landing page and Back/Forward transitions", async () => {
    const router = await mount("pathway", "family", "/pathway");
    expect(await screen.findByRole("heading", { name: "Landing page" })).toBeTruthy();
    await act(async () => { await router.navigate({ to: "/pathway/family" }); });
    expect(await screen.findByRole("heading", { name: "Detail page" })).toBeTruthy();
    await act(async () => { router.history.back(); });
    expect(await screen.findByRole("heading", { name: "Landing page" })).toBeTruthy();
    await act(async () => { router.history.forward(); });
    expect(await screen.findByRole("heading", { name: "Detail page" })).toBeTruthy();
  });

  it("still enforces a parent beforeLoad guard on a child URL", async () => {
    await mount("admin", "orgs", "/admin/orgs", true);
    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Detail page" })).toBeNull();
    expect(landingRender).not.toHaveBeenCalled();
  });
});
