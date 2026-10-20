// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Link, Outlet, RouterProvider } from "@tanstack/react-router";
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null, loading: false }) }));
import { ContextualBackLink, NavigationOriginProvider } from "../../src/components/navigation/NavigationOriginProvider";
afterEach(cleanup);
it("records a real router transition and returns to the original selected page", async () => {
  const root = createRootRoute({ component: () => <NavigationOriginProvider><Outlet /></NavigationOriginProvider> });
  const home = createRoute({ getParentRoute: () => root, path: "/", component: () => <><h1>Home</h1><Link to="/calendar">Open Calendar</Link></> });
  const calendar = createRoute({ getParentRoute: () => root, path: "/calendar", component: () => <><h1>Calendar</h1><ContextualBackLink to="/dashboard" label="Back to Dashboard" /></> });
  const history = createMemoryHistory({ initialEntries: ["/?section=tools#planning"] });
  const router = createRouter({ routeTree: root.addChildren([home, calendar]), history });
  await act(async () => { await router.load(); });
  render(<RouterProvider router={router} />);
  fireEvent.click(await screen.findByRole("link", { name: "Open Calendar" }));
  const back = await screen.findByRole("link", { name: "Back to Home" });
  expect(back.getAttribute("href")).toBe("/?section=tools#planning");
  expect(screen.queryByRole("link", { name: "Back to Dashboard" })).toBeNull();
  fireEvent.click(back);
  await waitFor(() => expect(history.location.href).toBe("/?section=tools#planning"));
  expect(await screen.findByRole("heading", { name: "Home" })).toBeTruthy();
});
