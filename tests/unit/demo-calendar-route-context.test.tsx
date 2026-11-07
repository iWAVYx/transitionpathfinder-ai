// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { useDemoSchool } from "@/lib/demo/use-role-context";
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@/lib/demo/use-demo-student", () => ({ useDemoStudent: () => ({ profileId: "sam", hydrated: true }) }));
vi.mock("@/components/demo/DemoMeetingGuide", () => ({ DemoMeetingGuide: () => null }));
vi.mock("@/components/partner-network/PartnerNetworkPage", () => ({ PartnerNetworkPage: () => null }));
vi.mock("@/components/demo/DemoFeatureShell", () => ({ DemoFeatureShell: ({ detail, richModule }: any) => <><output data-testid="event-count">{detail.stats[0].value}</output><output data-testid="row-count">{detail.rows.length}</output>{richModule}</> }));
vi.mock("@/components/calendar/TransitionCalendar", () => ({ TransitionCalendar: ({ events }: any) => {
  const { setSchool } = useDemoSchool();
  return <><button onClick={() => setSchool("specialized")}>Specialized School</button><output data-testid="calendar-count">{events.length}</output>{events.filter((event: any) => event.href).map((event: any) => <a key={event.id} href={event.href}>{event.title}</a>)}</>;
} }));
import { Route } from "@/routes/demo_.feature.$role.$slug";
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
it("the actual school calendar route updates event links and summary rows together without changing roles", async () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(Route, "useParams").mockReturnValue({ role: "school-admin", slug: "calendar" });
  const root = createRootRoute();
  const page = createRoute({ getParentRoute: () => root, path: "/demo/feature/$role/$slug", component: Route.options.component });
  const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: ["/demo/feature/school-admin/calendar?school=comprehensive"] }) });
  await router.load(); render(<RouterProvider router={router} />);
  await screen.findByRole("button", { name: "Specialized School" });
  function verify(id: string) {
    const count = screen.getByTestId("calendar-count").textContent;
    expect(screen.getByTestId("event-count").textContent).toBe(count);
    expect(screen.getByTestId("row-count").textContent).toBe(count);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const url = new URL(link.getAttribute("href")!, "https://example.test");
      expect(url.pathname).toMatch(/^\/demo\/feature\/school-admin\//);
      expect([...url.searchParams.entries()]).toEqual([["school", id]]);
    }
  }
  verify("comprehensive");
  fireEvent.click(screen.getByRole("button", { name: "Specialized School" }));
  await waitFor(() => verify("specialized"));
  expect(router.state.location.pathname).toBe("/demo/feature/school-admin/calendar");
  router.history.back();
  await waitFor(() => verify("comprehensive"));
});
