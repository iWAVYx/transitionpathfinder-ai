// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { RelatedToolLinks } from "@/components/dashboard/ToolPreviewCard";
import { RELATED_TOOLS } from "@/lib/dashboard/related-tools";
import { DemoPathwayBuilder } from "@/components/demo/DemoPathwayBuilder";
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@/components/pathway/IepUpload", () => ({ IepUpload: () => { throw new Error("No live uploads in dashboard demo checks"); } }));
afterEach(() => { cleanup(); sessionStorage.clear(); });
it.each([false, true])("the educator dashboard shortcut opens the actual builder in educator perspective (existingFamilyDraft=%s)", async existingDraft => {
  if (existingDraft) {
    // Prepare a genuine family draft using the real builder before following the educator link.
    const seed = createRootRoute({ component: DemoPathwayBuilder });
    const seedRouter = createRouter({ routeTree: seed, history: createMemoryHistory({ initialEntries: ["/?role=family"] }) });
    await seedRouter.load(); const seeded = render(<RouterProvider router={seedRouter} />);
    expect((await screen.findByTestId("pathway-role-family")).getAttribute("aria-pressed")).toBe("true");
    expect(JSON.parse(sessionStorage.getItem("tf:demo:pathway-builder:v1")!).values.submitter_role).toBe("family");
    seeded.unmount();
  }
  const root = createRootRoute({ component: Outlet });
  const dashboard = createRoute({ getParentRoute: () => root, path: "/", component: () => <RelatedToolLinks sample studentId="jordan" actions={RELATED_TOOLS["educator:pathway-reports"]} /> });
  const builder = createRoute({ getParentRoute: () => root, path: "/demo/intake", component: DemoPathwayBuilder });
  const router = createRouter({ routeTree: root.addChildren([dashboard, builder]), history: createMemoryHistory({ initialEntries: ["/"] }) });
  await router.load(); render(<RouterProvider router={router} />);
  fireEvent.click(await screen.findByRole("link", { name: "Start Pathway Builder" }));
  const educator = await screen.findByTestId("pathway-role-educator");
  expect(educator.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByTestId("pathway-role-family").getAttribute("aria-pressed")).toBe("false");
  expect(router.state.location.search).toMatchObject({ role: "educator", student: "jordan" });
  expect(screen.queryByTestId("pathway-role-student")).toBeNull(); expect(screen.queryByLabelText(/upload/i)).toBeNull();
});
