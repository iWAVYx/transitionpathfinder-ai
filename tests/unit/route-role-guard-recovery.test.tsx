// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  redirect,
  isRedirect,
} from "@tanstack/react-router";
const api = vi.hoisted(() => ({ roles: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/profile.functions", () => ({ getMyRoles: api.roles }));
import { ensureRoleAccess } from "@/lib/route-role-guard";
import { RouteErrorComponent } from "@/components/routing/RouteErrorComponent";
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it.each(["student", "parent", "educator", "school_admin", "district_admin", "partner", "admin"])(
  "preserves valid %s eligibility",
  async (role) => {
    api.roles.mockResolvedValue({ roles: [role] });
    const audience = role === "parent" ? "family" : role;
    await expect(ensureRoleAccess([audience as any])).resolves.toBeUndefined();
  },
);
it.each([new Error("PRIVATE database detail"), null, { roles: null }, { roles: [null] }])(
  "failed role reads do not authorize the route: %j",
  async (result) => {
    if (result instanceof Error) api.roles.mockRejectedValue(result);
    else api.roles.mockResolvedValue(result);
    await expect(ensureRoleAccess(["family"])).rejects.toThrow(
      "Your workspace access could not be checked. Please try again.",
    );
  },
);
it.each([
  ["student", "/dashboard"],
  ["parent", "/dashboard"],
  ["educator", "/caseload"],
  ["school_admin", "/school/overview"],
  ["district_admin", "/district/overview"],
  ["partner", "/partners-manage"],
  ["admin", "/owner"],
  ["other", "/onboarding"],
])("denied %s redirects to %s", async (role, to) => {
  api.roles.mockResolvedValue({ roles: [role] });
  let caught: any;
  try {
    await ensureRoleAccess([]);
  } catch (error) {
    caught = error;
  }
  expect(isRedirect(caught)).toBe(true);
  expect(caught.options.to).toBe(to);
  expect(caught.options.replace).toBe(true);
});
it("preserves an existing framework redirect from the server call", async () => {
  const error = redirect({ to: "/login" });
  api.roles.mockRejectedValue(error);
  await expect(ensureRoleAccess(["family"])).rejects.toBe(error);
});
it("actual router retry rechecks access before running the protected loader", async () => {
  api.roles
    .mockRejectedValueOnce(new Error("PRIVATE detail"))
    .mockResolvedValue({ roles: ["parent"] });
  const root = createRootRoute();
  const page = createRoute({
    getParentRoute: () => root,
    path: "/family",
    beforeLoad: () => ensureRoleAccess(["family"]),
    loader: () => {
      api.read();
      return null;
    },
    component: () => <p>Verified Family Page</p>,
    errorComponent: RouteErrorComponent,
  });
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/family"] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByText("This page didn't load");
  expect(api.read).not.toHaveBeenCalled();
  expect(screen.queryByText("Verified Family Page")).toBeNull();
  expect(screen.queryByText("PRIVATE detail")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try loading this page again" }));
  await screen.findByText("Verified Family Page");
  expect(api.roles).toHaveBeenCalledTimes(2);
  expect(api.read).toHaveBeenCalledOnce();
  await waitFor(() => expect(router.state.status).toBe("idle"));
});
