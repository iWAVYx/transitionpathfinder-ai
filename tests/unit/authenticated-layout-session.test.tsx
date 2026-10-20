// @vitest-environment jsdom
import { useEffect, useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({
  profile: vi.fn(),
  admin: vi.fn(),
  navigate: vi.fn(),
  read: vi.fn(),
  unmount: vi.fn(),
  feedback: vi.fn(),
  session: vi.fn(),
  aal: vi.fn(),
  viewer: "caller",
  loading: false,
  path: "/dashboard",
  searchStr: "",
  hash: "",
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<any>()),
  createFileRoute: () => (options: any) => ({ options }),
  useNavigate: () => api.navigate,
  useLocation: () => ({ pathname: api.path, searchStr: api.searchStr, hash: api.hash }),
  Outlet: () => {
    const [draft, setDraft] = useState(0);
    useEffect(() => {
      api.read(api.viewer);
      return () => {
        api.unmount();
      };
    }, []);
    return (
      <article>
        Protected Workspace
        <button onClick={() => setDraft((v) => v + 1)}>Local Draft {draft}</button>
      </article>
    );
  },
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: api.viewer ? { id: api.viewer, email: api.viewer + "@example.test" } : null,
    loading: api.loading,
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: api.session, mfa: { getAuthenticatorAssuranceLevel: api.aal } } },
}));
vi.mock("@/lib/profile.functions", () => ({ getProfile: api.profile }));
vi.mock("@/lib/owner/owner.functions", () => ({ getMyAdminRoles: api.admin }));
vi.mock("@/components/feedback/FeedbackButton", () => ({
  FeedbackButton: () => {
    useEffect(() => {
      api.feedback();
    }, []);
    return <p>Feedback Control</p>;
  },
}));
import { Route } from "@/routes/_authenticated";
const Page = (Route as any).options.component;
const beforeLoad = (Route as any).options.beforeLoad;
const node = () => <Page />;
function pending() {
  let resolve!: (v: any) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  api.profile.mockImplementation(async () => ({ id: api.viewer, onboarding_completed: true }));
  api.admin.mockResolvedValue({ isPlatformAdmin: false });
  api.session.mockResolvedValue({ data: { session: { user: { id: "caller" } } } });
  api.aal.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" } });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  api.viewer = "caller";
  api.loading = false;
  api.path = "/dashboard";
  api.searchStr = "";
  api.hash = "";
});
it.each(["student", "parent", "educator", "school_admin", "district_admin", "partner"])(
  "%s gets a visible shell before its completed-profile check, then fresh children",
  async (role) => {
    api.viewer = role;
    const old = pending();
    api.profile.mockReturnValueOnce(old.promise);
    render(node());
    expect(screen.getByRole("main").getAttribute("data-auth-state")).toBe("session-loading");
    expect(api.read).not.toHaveBeenCalled();
    expect(api.feedback).not.toHaveBeenCalled();
    await act(async () => old.resolve({ id: role, onboarding_completed: true }));
    await screen.findByText("Protected Workspace");
    expect(api.profile).toHaveBeenCalledWith({ data: { expected_viewer_id: role } });
    expect(api.admin).not.toHaveBeenCalled();
    await waitFor(() => expect(api.read).toHaveBeenCalledWith(role));
  },
);
it("profile failure offers real retry and never marks onboarding checked", async () => {
  api.profile.mockRejectedValueOnce(new Error("PRIVATE detail"));
  render(node());
  await screen.findByRole("alert");
  expect(api.read).not.toHaveBeenCalled();
  expect(api.feedback).not.toHaveBeenCalled();
  expect(screen.queryByText("PRIVATE detail")).toBeNull();
  fireEvent.click(screen.getByText("Try Again"));
  await screen.findByText("Protected Workspace");
  expect(api.profile).toHaveBeenCalledTimes(2);
  // DOM visibility does not guarantee that the mounted Outlet effect ran.
  await waitFor(() => expect(api.read).toHaveBeenCalledOnce());
});
it.each([
  { id: "other", onboarding_completed: true },
  { id: "caller" },
  { id: "caller", onboarding_completed: "true" },
])("does not open a malformed or other-viewer profile: %j", async (profile) => {
  api.profile.mockResolvedValue(profile);
  render(node());
  await screen.findByRole("alert");
  expect(api.read).not.toHaveBeenCalled();
  expect(api.admin).not.toHaveBeenCalled();
  expect(api.navigate).not.toHaveBeenCalled();
});
it.each([true, false])(
  "unfinished onboarding waits for Owner confirmation and routes correctly (Owner %s)",
  async (owner) => {
    api.profile.mockResolvedValue({ id: "caller", onboarding_completed: false });
    const old = pending();
    api.admin.mockReturnValueOnce(old.promise);
    render(node());
    await waitFor(() =>
      expect(api.admin).toHaveBeenCalledWith({ data: { expected_viewer_id: "caller" } }),
    );
    expect(api.read).not.toHaveBeenCalled();
    expect(api.navigate).not.toHaveBeenCalled();
    await act(async () => old.resolve({ isPlatformAdmin: owner }));
    await waitFor(() =>
      expect(api.navigate).toHaveBeenCalledWith({
        to: owner ? "/owner" : "/onboarding",
        replace: true,
      }),
    );
    expect(api.read).not.toHaveBeenCalled();
  },
);
it("failed Owner status cannot misroute an Owner to onboarding and can retry", async () => {
  api.profile.mockResolvedValue({ id: "caller", onboarding_completed: false });
  api.admin
    .mockRejectedValueOnce(new Error("PRIVATE admin error"))
    .mockResolvedValue({ isPlatformAdmin: true });
  render(node());
  await screen.findByRole("alert");
  expect(api.navigate).not.toHaveBeenCalled();
  expect(api.read).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Try Again"));
  await waitFor(() => expect(api.navigate).toHaveBeenCalledWith({ to: "/owner", replace: true }));
  expect(api.read).not.toHaveBeenCalled();
});
it.each(["owner", "not-owner", "error"])(
  "late prior-account Admin result %s cannot redirect the new account",
  async (result) => {
    api.profile.mockResolvedValueOnce({ id: "caller", onboarding_completed: false });
    const old = pending();
    api.admin.mockReturnValueOnce(old.promise);
    const v = render(node());
    await waitFor(() => expect(api.admin).toHaveBeenCalledOnce());
    api.viewer = "other";
    v.rerender(node());
    await screen.findByText("Protected Workspace");
    await act(async () =>
      result === "error"
        ? old.reject(new Error("old"))
        : old.resolve({ isPlatformAdmin: result === "owner" }),
    );
    expect(api.navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(api.read.mock.calls).toEqual([["other"]]);
  },
);
it("a departed profile cannot start an Owner read or redirect", async () => {
  const old = pending();
  api.profile.mockReturnValueOnce(old.promise);
  const v = render(node());
  await waitFor(() => expect(api.profile).toHaveBeenCalledOnce());
  api.viewer = "other";
  v.rerender(node());
  await screen.findByText("Protected Workspace");
  await act(async () => old.resolve({ id: "caller", onboarding_completed: false }));
  expect(api.admin).not.toHaveBeenCalled();
  expect(api.navigate).not.toHaveBeenCalled();
  expect(api.read.mock.calls).toEqual([["other"]]);
});
it.each(["account", "loading", "signed-out"])(
  "removes accepted children during %s before reusing the layout",
  async (state) => {
    const v = render(node());
    await screen.findByText("Protected Workspace");
    await waitFor(() => expect(api.read.mock.calls).toEqual([["caller"]]));
    const next = pending();
    api.profile.mockReturnValueOnce(next.promise);
    if (state === "account") api.viewer = "other";
    else if (state === "loading") api.loading = true;
    else api.viewer = "";
    v.rerender(node());
    expect(screen.queryByText("Protected Workspace")).toBeNull();
    expect(api.unmount).toHaveBeenCalledOnce();
    api.viewer = "other";
    api.loading = false;
    v.rerender(node());
    expect(screen.queryByText("Protected Workspace")).toBeNull();
    await act(async () => next.resolve({ id: "other", onboarding_completed: true }));
    await screen.findByText("Protected Workspace");
    expect(api.read.mock.calls).toEqual([["caller"], ["other"]]);
  },
);
it("auth restoration starts no workspace reads until settled", async () => {
  api.loading = true;
  const v = render(node());
  expect(api.profile).not.toHaveBeenCalled();
  expect(api.admin).not.toHaveBeenCalled();
  expect(api.read).not.toHaveBeenCalled();
  api.loading = false;
  v.rerender(node());
  await screen.findByText("Protected Workspace");
});
it.each([
  "/onboarding",
  "/settings",
  "/redeem-access",
  "/owner",
  "/owner/health",
  "/admin",
  "/admin/tools",
])(
  "retains the existing onboarding exemption for %s without granting route permissions",
  async (path) => {
    api.path = path;
    render(node());
    await screen.findByText("Protected Workspace");
    expect(api.profile).not.toHaveBeenCalled();
    expect(api.admin).not.toHaveBeenCalled();
  },
);
it.each(["/ownership", "/administrator"])("%s is not an exempt prefix lookalike", async (path) => {
  api.path = path;
  api.profile.mockRejectedValue(new Error("failed"));
  render(node());
  await screen.findByRole("alert");
  expect(api.read).not.toHaveBeenCalled();
  expect(api.profile).toHaveBeenCalledOnce();
});
it("leaving an exempt page still checks the new protected page", async () => {
  api.path = "/settings";
  const v = render(node());
  await screen.findByText("Protected Workspace");
  const old = pending();
  api.profile.mockReturnValueOnce(old.promise);
  api.path = "/dashboard";
  v.rerender(node());
  expect(screen.queryByText("Protected Workspace")).toBeNull();
  await act(async () => old.resolve({ id: "caller", onboarding_completed: true }));
  await screen.findByText("Protected Workspace");
  expect(api.profile).toHaveBeenCalledOnce();
});
it("same-page query/hash changes retain child state without rechecking profile", async () => {
  const v = render(node());
  await screen.findByText("Protected Workspace");
  fireEvent.click(screen.getByText("Local Draft 0"));
  api.searchStr = "?student_id=sample";
  api.hash = "kept";
  v.rerender(node());
  expect(screen.getByText("Local Draft 1")).toBeTruthy();
  expect(api.profile).toHaveBeenCalledOnce();
  expect(api.read).toHaveBeenCalledOnce();
});
it.each([false, true])(
  "unmounted onboarding reads cannot route or open children (Admin stage %s)",
  async (adminStage) => {
    const old = pending();
    if (adminStage) {
      api.profile.mockResolvedValue({ id: "caller", onboarding_completed: false });
      api.admin.mockReturnValueOnce(old.promise);
    } else api.profile.mockReturnValueOnce(old.promise);
    const v = render(node());
    await waitFor(() => expect(adminStage ? api.admin : api.profile).toHaveBeenCalledOnce());
    v.unmount();
    await act(async () =>
      old.resolve(
        adminStage ? { isPlatformAdmin: true } : { id: "caller", onboarding_completed: false },
      ),
    );
    expect(api.navigate).not.toHaveBeenCalled();
    expect(api.read).not.toHaveBeenCalled();
    if (!adminStage) expect(api.admin).not.toHaveBeenCalled();
  },
);
it("onboarding navigation failure offers retry without opening the old page", async () => {
  api.profile.mockResolvedValue({ id: "caller", onboarding_completed: false });
  api.navigate.mockRejectedValueOnce(new Error("failed"));
  render(node());
  await screen.findByRole("alert");
  expect(api.read).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Try Again"));
  await waitFor(() => expect(api.navigate).toHaveBeenCalledTimes(2));
});
it("expired-session login keeps the current local query and hash", async () => {
  api.viewer = "";
  api.path = "/family/history";
  api.searchStr = "?student_id=sample";
  api.hash = "kept";
  render(node());
  await waitFor(() => expect(api.navigate).toHaveBeenCalled());
  expect(api.navigate.mock.calls[0][0].search.redirect).toBe(
    "/family/history?student_id=sample#kept",
  );
  expect(api.navigate.mock.calls[0][0]).toMatchObject({ replace: true, reloadDocument: true });
  expect(api.profile).not.toHaveBeenCalled();
  expect(api.read).not.toHaveBeenCalled();
});
it("a prior login navigation error does not reappear after a new signed-in session", async () => {
  api.viewer = "";
  api.navigate.mockRejectedValueOnce(new Error("failed"));
  const v = render(node());
  await screen.findByRole("alert");
  api.viewer = "caller";
  v.rerender(node());
  await screen.findByText("Protected Workspace");
  const next = pending();
  api.navigate.mockReturnValueOnce(next.promise);
  api.viewer = "";
  v.rerender(node());
  expect(screen.queryByRole("alert")).toBeNull();
  await act(async () => next.resolve(undefined));
  expect(api.read).toHaveBeenCalledOnce();
});
it.each(["login", "mfa"])("beforeLoad preserves the local context for %s", async (kind) => {
  if (kind === "login") api.session.mockResolvedValue({ data: { session: null } });
  else api.aal.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" } });
  await expect(
    beforeLoad({
      location: { pathname: "/reports/sample", searchStr: "?view=print", hash: "section" },
    }),
  ).rejects.toMatchObject({
    options: {
      to: kind === "login" ? "/login" : "/login/2fa",
      search: { redirect: "/reports/sample?view=print#section" },
    },
  });
  expect(api.profile).not.toHaveBeenCalled();
});

it.each(["owner", "not-owner", "error"])(
  "a departed path's Admin result %s cannot redirect the new path",
  async (result) => {
    api.profile.mockResolvedValue({ id: "caller", onboarding_completed: false });
    const old = pending();
    api.admin.mockReturnValueOnce(old.promise);
    const v = render(node());
    await waitFor(() => expect(api.admin).toHaveBeenCalledOnce());
    api.path = "/settings";
    v.rerender(node());
    await screen.findByText("Protected Workspace");
    await act(async () =>
      result === "error"
        ? old.reject(new Error("old"))
        : old.resolve({ isPlatformAdmin: result === "owner" }),
    );
    expect(api.navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(api.read.mock.calls).toEqual([["caller"]]);
  },
);

it("beforeLoad stops on a failed local session read before checking assurance", async () => {
  api.session.mockResolvedValue({
    data: { session: { user: { id: "caller" } } },
    error: { message: "PRIVATE session error" },
  });
  await expect(beforeLoad({ location: { pathname: "/dashboard" } })).rejects.toThrow(
    "Your session could not be checked. Please try again.",
  );
  expect(api.aal).not.toHaveBeenCalled();
  expect(api.profile).not.toHaveBeenCalled();
  expect(api.read).not.toHaveBeenCalled();
});
it.each([
  {
    data: { currentLevel: "aal1", nextLevel: "aal1" },
    error: { message: "PRIVATE assurance error" },
  },
  { data: null, error: null },
  { data: { currentLevel: "unknown", nextLevel: "aal1" }, error: null },
])("unknown/failed assurance never authorizes entry: %j", async (response) => {
  api.aal.mockResolvedValue(response);
  await expect(beforeLoad({ location: { pathname: "/dashboard" } })).rejects.toThrow(
    "Your sign-in security could not be checked. Please try again.",
  );
  expect(api.profile).not.toHaveBeenCalled();
  expect(api.read).not.toHaveBeenCalled();
});
it("beforeLoad retains a completed two-factor session", async () => {
  api.aal.mockResolvedValue({ data: { currentLevel: "aal2", nextLevel: "aal2" }, error: null });
  await expect(beforeLoad({ location: { pathname: "/owner" } })).resolves.toBeUndefined();
  expect(api.profile).not.toHaveBeenCalled();
});

// Shared missing-session behavior applies to every protected workspace.
const SIGNED_OUT_WORKSPACES = [
  "/owner",
  "/owner/health",
  "/family/history",
  "/students",
  "/caseload",
  "/admin-school",
  "/district/overview",
  "/partners-manage",
];
it.each(SIGNED_OUT_WORKSPACES)(
  "missing-session %s uses one document transition and preserves its return context",
  async (path) => {
    api.viewer = "";
    api.path = path;
    api.searchStr = "?context=fictional";
    api.hash = "section";
    const view = render(node());
    await waitFor(() => expect(api.navigate).toHaveBeenCalledOnce());
    expect(api.navigate).toHaveBeenCalledWith({
      to: "/login",
      search: { redirect: path + "?context=fictional#section", reason: expect.any(String) },
      replace: true,
      reloadDocument: true,
    });
    view.rerender(node());
    await act(async () => {});
    expect(api.navigate).toHaveBeenCalledOnce();
    expect(api.profile).not.toHaveBeenCalled();
    expect(api.admin).not.toHaveBeenCalled();
    expect(api.read).not.toHaveBeenCalled();
  },
);
it.each(SIGNED_OUT_WORKSPACES)(
  "initial missing-session %s requests a fresh sign-in document before private lookups",
  async (path) => {
    api.session.mockResolvedValue({ data: { session: null }, error: null });
    await expect(
      beforeLoad({
        location: { pathname: path, searchStr: "?context=fictional", hash: "section" },
      }),
    ).rejects.toMatchObject({
      options: {
        to: "/login",
        replace: true,
        reloadDocument: true,
        search: { redirect: path + "?context=fictional#section" },
      },
    });
    expect(api.aal).not.toHaveBeenCalled();
    expect(api.profile).not.toHaveBeenCalled();
    expect(api.admin).not.toHaveBeenCalled();
  },
);
