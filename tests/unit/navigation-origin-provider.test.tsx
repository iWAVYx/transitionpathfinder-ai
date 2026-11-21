// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Link, Outlet, RouterProvider } from "@tanstack/react-router";
const auth = vi.hoisted(() => ({
  user: null as null | { id: string }, loading: false,
  snapshot: { user: null as null | { id: string }, loading: false },
  listeners: new Set<() => void>(),
}));
vi.mock("@/hooks/use-auth", async () => {
  const React = await import("react");
  return { useAuth: () => React.useSyncExternalStore(
    notify => { auth.listeners.add(notify); return () => auth.listeners.delete(notify); },
    () => auth.snapshot, () => auth.snapshot,
  ) };
});
beforeEach(() => { auth.user = null; auth.loading = false; auth.snapshot = { user: null, loading: false }; });
async function notifyAuth() {
  await act(async () => {
    auth.snapshot = { user: auth.user, loading: auth.loading };
    auth.listeners.forEach(notify => notify());
  });
}
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

async function loadingFixture(start: string) {
  auth.snapshot = { user: auth.user, loading: auth.loading };
  const root = createRootRoute({ component: () => <NavigationOriginProvider><Outlet /></NavigationOriginProvider> });
  const home = createRoute({ getParentRoute: () => root, path: "/", component: () => <Link to="/calendar">Open Calendar</Link> });
  const owner = createRoute({ getParentRoute: () => root, path: "/owner", component: () => <Link to="/calendar">Open Calendar</Link> });
  const calendar = createRoute({ getParentRoute: () => root, path: "/calendar", component: () => <ContextualBackLink to="/dashboard" label="Back to Dashboard" /> });
  const history = createMemoryHistory({ initialEntries: [start] });
  const router = createRouter({ routeTree: root.addChildren([home, owner, calendar]), history });
  await act(async () => { await router.load(); });
  const view = render(<RouterProvider router={router} />);
  fireEvent.click(await screen.findByRole("link", { name: "Open Calendar" }));
  await screen.findByRole("link", { name: start.startsWith("/owner") ? "Back to Owner Hub" : "Back to Home" });
  return { router, history, view };
}
it("keeps a genuine guest origin when the initial signed-out session check completes", async () => {
  auth.loading = true;
  const { router, history, view } = await loadingFixture("/?section=guided#pathways");
  auth.loading = false;
  await notifyAuth();
  const back = await screen.findByRole("link", { name: "Back to Home" });
  expect(back.getAttribute("href")).toBe("/?section=guided#pathways");
  fireEvent.click(back);
  await waitFor(() => expect(history.location.href).toBe("/?section=guided#pathways"));
  await act(async () => { history.forward(); });
  await waitFor(() => expect(history.location.href).toBe("/calendar"));
});
it("still discards remembered origins when the actual account changes", async () => {
  auth.user = { id: "first-viewer" };
  const { router, view } = await loadingFixture("/owner?scope=fictional#management");
  auth.user = { id: "second-viewer" };
  await notifyAuth();
  expect(await screen.findByRole("link", { name: "Back to Dashboard" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Back to Owner Hub" })).toBeNull();
});
it("clears an identified viewer's origin during unresolved session loading", async () => {
  auth.user = { id: "first-viewer" };
  const { router, view } = await loadingFixture("/owner?scope=fictional#management");
  auth.loading = true;
  await notifyAuth();
  expect(await screen.findByRole("link", { name: "Back to Dashboard" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Back to Owner Hub" })).toBeNull();
});

it("discards private origins when an identified viewer signs out", async () => {
  auth.user = { id: "first-viewer" };
  await loadingFixture("/owner?scope=fictional#management");
  auth.user = null;
  await notifyAuth();
  expect(await screen.findByRole("link", { name: "Back to Dashboard" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Back to Owner Hub" })).toBeNull();
});
