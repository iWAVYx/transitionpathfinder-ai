// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
const api = vi.hoisted(() => ({
  viewer: null as string | null,
  roles: vi.fn(),
  session: vi.fn(),
  aal: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: api.viewer ? { id: api.viewer } : null, loading: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: api.session, mfa: { getAuthenticatorAssuranceLevel: api.aal } } },
}));
vi.mock("@/lib/profile.functions", () => ({ getProfile: vi.fn() }));
vi.mock("@/lib/owner/owner.functions", () => ({ getMyAdminRoles: api.roles }));
vi.mock("@/components/feedback/FeedbackButton", () => ({ FeedbackButton: () => null }));
import { Route as Protected } from "@/routes/_authenticated";
import { Route as Owner } from "@/routes/_authenticated/owner";
import { OwnerShell } from "@/components/owner/OwnerShell";
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.viewer = null;
  api.session.mockResolvedValue({ data: { session: null }, error: null });
  api.roles.mockResolvedValue({ isPlatformAdmin: true });
  api.aal.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
});
async function setup(path: string) {
  const root = createRootRoute({ component: Outlet });
  const login = createRoute({
    getParentRoute: () => root,
    path: "login",
    component: () => <h1>Sign-in boundary</h1>,
  });
  const auth = createRoute({
    getParentRoute: () => root,
    id: "_authenticated",
    ...(Protected.options as any),
  });
  const owner = createRoute({
    getParentRoute: () => auth,
    path: "owner",
    ...(Owner.options as any),
  });
  const home = createRoute({
    getParentRoute: () => owner,
    path: "/",
    component: () => (
      <OwnerShell title="Owner route fixture">
        <p>Management fixture</p>
      </OwnerShell>
    ),
  });
  const health = createRoute({
    getParentRoute: () => owner,
    path: "health",
    component: () => (
      <OwnerShell title="Health route fixture">
        <p>Health fixture</p>
      </OwnerShell>
    ),
  });
  const router = createRouter({
    routeTree: root.addChildren([login, auth.addChildren([owner.addChildren([home, health])])]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await act(async () => {
    render(<RouterProvider router={router} />);
    await router.load();
  });
  return router;
}
it.each(["/owner", "/owner/health"])(
  "authorized %s mounts the real OwnerShell with stable router hooks",
  async (path) => {
    api.viewer = "fictional-owner";
    api.session.mockResolvedValue({ data: { session: { user: { id: api.viewer } } }, error: null });
    const router = await setup(path);
    await screen.findByRole("heading", {
      name: path === "/owner" ? "Owner route fixture" : "Health route fixture",
    });
    expect(api.roles.mock.calls.length).toBeLessThan(5);
    expect(router.state.location.pathname).toBe(path);
  },
);
