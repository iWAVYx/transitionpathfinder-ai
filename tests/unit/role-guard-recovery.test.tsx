// @vitest-environment jsdom
import { useEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({
  roles: vi.fn(),
  navigate: vi.fn(),
  toast: vi.fn(),
  read: vi.fn(),
  unmount: vi.fn(),
  viewer: "caller",
  loading: false,
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => api.navigate,
  Link: ({ to, search, children, ...rest }: any) => (
    <a href={to + (search ? "?" + new URLSearchParams(search).toString() : "")} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: api.viewer ? { id: api.viewer, email: "caller@example.test" } : null,
    loading: api.loading,
  }),
}));
vi.mock("@/lib/profile.functions", () => ({ getMyRoles: api.roles }));
vi.mock("sonner", () => ({ toast: { error: api.toast } }));
import { RoleGuard } from "@/components/RoleGuard";
import { MainLandmarkContext } from "@/components/site/main-landmark-context";
import type { RoleAudience } from "@/lib/role-policy";
function Payload() {
  useEffect(() => {
    api.read();
    return () => {
      api.unmount();
    };
  }, []);
  return <p>Protected Payload</p>;
}
function pending() {
  let resolve!: (v: any) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const roleCases = [
  { role: "student", path: "/student/history" },
  { role: "parent", path: "/family/history" },
  { role: "educator", path: "/educator/history" },
  { role: "school_admin", path: "/school/history" },
  { role: "district_admin", path: "/district/history" },
  { role: "partner", path: "/partner/history" },
  { role: "admin", path: "/owner" },
];
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  api.viewer = "caller";
  api.loading = false;
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});
it.each(roleCases)(
  "$role mounts protected content only after a successful check",
  async ({ role, path }) => {
    const old = pending();
    api.roles.mockReturnValueOnce(old.promise);
    render(
      <RoleGuard path={path}>
        <Payload />
      </RoleGuard>,
    );
    expect(screen.getByRole("main")).toBeTruthy();
    expect(api.read).not.toHaveBeenCalled();
    expect(screen.queryByText("Protected Payload")).toBeNull();
    await act(async () => old.resolve({ roles: [role] }));
    await screen.findByText("Protected Payload");
    // Visible DOM may precede Payload's passive effect under CI scheduling.
    await waitFor(() => expect(api.read).toHaveBeenCalledOnce());
    expect(api.roles).toHaveBeenCalledWith({ data: { expected_viewer_id: "caller" } });
  },
);
it.each(roleCases)(
  "$role read failures hide the payload and retry safely",
  async ({ role, path }) => {
    api.roles
      .mockRejectedValueOnce(new Error("PRIVATE backend detail"))
      .mockResolvedValue({ roles: [role] });
    render(
      <RoleGuard path={path} keepMounted>
        <Payload />
      </RoleGuard>,
    );
    await screen.findByRole("alert");
    expect(api.read).not.toHaveBeenCalled();
    expect(screen.queryByText("PRIVATE backend detail")).toBeNull();
    expect(api.navigate).not.toHaveBeenCalled();
    expect(api.toast).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Try Again"));
    await screen.findByText("Protected Payload");
    // Visible DOM may precede Payload's passive effect under CI scheduling.
    await waitFor(() => expect(api.read).toHaveBeenCalledOnce());
    expect(api.roles).toHaveBeenCalledTimes(2);
  },
);
it.each([false, true])(
  "keepMounted=%s preserves the provided shell without starting protected reads",
  async (keepMounted) => {
    const old = pending();
    api.roles.mockReturnValueOnce(old.promise);
    render(
      <RoleGuard
        path="/dashboard"
        allow={["family"]}
        keepMounted={keepMounted}
        fallback={<main data-testid="parent-dashboard-main">Loading Family Shell</main>}
      >
        <Payload />
      </RoleGuard>,
    );
    expect(screen.getByTestId("parent-dashboard-main")).toBeTruthy();
    expect(api.read).not.toHaveBeenCalled();
    await act(async () => old.resolve({ roles: ["student"] }));
    await waitFor(() =>
      expect(api.navigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true }),
    );
    expect(api.read).not.toHaveBeenCalled();
    expect(screen.getByText("Loading Family Shell")).toBeTruthy();
  },
);
it.each(["pending", "signed-out"])(
  "does not read roles or mount payload while auth is %s",
  async (state) => {
    if (state === "pending") api.loading = true;
    else api.viewer = "";
    const v = render(
      <RoleGuard path="/family/history">
        <Payload />
      </RoleGuard>,
    );
    expect(api.roles).not.toHaveBeenCalled();
    expect(api.read).not.toHaveBeenCalled();
    if (state === "signed-out")
      expect(screen.getByRole("link", { name: "Sign In" }).getAttribute("href")).toBe(
        "/login?redirect=%2Ffamily%2Fhistory",
      );
    api.viewer = "caller";
    api.loading = false;
    api.roles.mockResolvedValue({ roles: ["parent"] });
    v.rerender(
      <RoleGuard path="/family/history">
        <Payload />
      </RoleGuard>,
    );
    await screen.findByText("Protected Payload");
  },
);
it.each(["pending", "signed-out", "account"])(
  "removes an allowed payload immediately on %s and rechecks before reuse",
  async (state) => {
    api.roles.mockResolvedValueOnce({ roles: ["parent"] });
    const v = render(
      <RoleGuard path="/family/history">
        <Payload />
      </RoleGuard>,
    );
    await screen.findByText("Protected Payload");
    const next = pending();
    api.roles.mockReturnValueOnce(next.promise);
    if (state === "pending") api.loading = true;
    else api.viewer = state === "account" ? "other" : "";
    v.rerender(
      <RoleGuard path="/family/history">
        <Payload />
      </RoleGuard>,
    );
    expect(screen.queryByText("Protected Payload")).toBeNull();
    expect(api.unmount).toHaveBeenCalledOnce();
    api.loading = false;
    api.viewer = "other";
    v.rerender(
      <RoleGuard path="/family/history">
        <Payload />
      </RoleGuard>,
    );
    expect(screen.queryByText("Protected Payload")).toBeNull();
    await act(async () => next.resolve({ roles: ["parent"] }));
    await screen.findByText("Protected Payload");
    expect(api.roles.mock.calls.at(-1)[0]).toEqual({ data: { expected_viewer_id: "other" } });
  },
);
it.each(["allowed", "denied", "error"])(
  "ignores departed account's %s result and never redirects or toasts",
  async (result) => {
    const old = pending();
    const next = pending();
    api.roles.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const v = render(
      <RoleGuard path="/family/history">
        <Payload />
      </RoleGuard>,
    );
    await waitFor(() => expect(api.roles).toHaveBeenCalledOnce());
    api.viewer = "other";
    v.rerender(
      <RoleGuard path="/family/history">
        <Payload />
      </RoleGuard>,
    );
    await waitFor(() => expect(api.roles).toHaveBeenCalledTimes(2));
    await act(async () =>
      result === "error"
        ? old.reject(new Error("old"))
        : old.resolve({ roles: [result === "allowed" ? "parent" : "student"] }),
    );
    expect(api.read).not.toHaveBeenCalled();
    expect(api.navigate).not.toHaveBeenCalled();
    expect(api.toast).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => next.resolve({ roles: ["parent"] }));
    await screen.findByText("Protected Payload");
    expect(api.read).toHaveBeenCalledOnce();
  },
);
it("changing path or policy hides old content and cannot reuse its allowed state", async () => {
  api.roles.mockResolvedValueOnce({ roles: ["parent"] });
  const node = (path: string, allow: RoleAudience[]) => (
    <RoleGuard path={path} allow={allow}>
      <Payload />
    </RoleGuard>
  );
  const v = render(node("/family/history", ["family"]));
  await screen.findByText("Protected Payload");
  const next = pending();
  api.roles.mockReturnValueOnce(next.promise);
  v.rerender(node("/partner/history", ["partner"]));
  expect(screen.queryByText("Protected Payload")).toBeNull();
  await act(async () => next.resolve({ roles: ["parent"] }));
  await waitFor(() => expect(api.navigate).toHaveBeenCalled());
  expect(api.read).toHaveBeenCalledOnce();
});
it("equivalent inline policies do not loop checks; changed permissions do recheck", async () => {
  api.roles.mockResolvedValue({ roles: ["parent"] });
  const node = (allow: RoleAudience[]) => (
    <RoleGuard path="/family/history" allow={allow}>
      <Payload />
    </RoleGuard>
  );
  const v = render(node(["family", "educator"]));
  await screen.findByText("Protected Payload");
  v.rerender(node(["educator", "family", "family"]));
  expect(api.roles).toHaveBeenCalledOnce();
  const old = pending();
  api.roles.mockReturnValueOnce(old.promise);
  v.rerender(node(["student"]));
  expect(screen.queryByText("Protected Payload")).toBeNull();
  await act(async () => old.resolve({ roles: ["parent"] }));
  await waitFor(() => expect(api.navigate).toHaveBeenCalled());
  expect(api.read).toHaveBeenCalledOnce();
});
it.each([false, true])(
  "unmounted check cannot notify or navigate (failure %s)",
  async (failure) => {
    const old = pending();
    api.roles.mockReturnValueOnce(old.promise);
    const v = render(
      <RoleGuard path="/family/history">
        <Payload />
      </RoleGuard>,
    );
    await waitFor(() => expect(api.roles).toHaveBeenCalledOnce());
    v.unmount();
    await act(async () =>
      failure ? old.reject(new Error("old")) : old.resolve({ roles: ["student"] }),
    );
    expect(api.navigate).not.toHaveBeenCalled();
    expect(api.toast).not.toHaveBeenCalled();
    expect(api.read).not.toHaveBeenCalled();
  },
);
it.each([{ roles: null }, { roles: [null] }])(
  "rejects malformed role responses without mounting payload: %j",
  async (result) => {
    api.roles.mockResolvedValue(result);
    render(
      <RoleGuard path="/family/history">
        <Payload />
      </RoleGuard>,
    );
    await screen.findByRole("alert");
    expect(api.read).not.toHaveBeenCalled();
    expect(api.navigate).not.toHaveBeenCalled();
  },
);
it("redirects a denied Owner directly to Owner Hub", async () => {
  api.roles.mockResolvedValue({ roles: ["admin"] });
  render(
    <RoleGuard path="/student/history" allow={["student"]}>
      <Payload />
    </RoleGuard>,
  );
  await waitFor(() => expect(api.navigate).toHaveBeenCalledWith({ to: "/owner", replace: true }));
  expect(api.read).not.toHaveBeenCalled();
});
it("a failed navigation offers retry without exposing the denied page", async () => {
  api.roles.mockResolvedValue({ roles: ["student"] });
  api.navigate.mockRejectedValueOnce(new Error("Navigation failed"));
  render(
    <RoleGuard path="/family/history">
      <Payload />
    </RoleGuard>,
  );
  await screen.findByRole("alert");
  expect(api.read).not.toHaveBeenCalled();
  expect(screen.getByText("Try Again")).toBeTruthy();
});

it.each(["allowed", "denied"])(
  "late policy result %s cannot affect the current path",
  async (result) => {
    const old = pending();
    const next = pending();
    api.roles.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const node = (path: string, allow: RoleAudience[]) => (
      <RoleGuard path={path} allow={allow}>
        <Payload />
      </RoleGuard>
    );
    const v = render(node("/family/history", ["family"]));
    await waitFor(() => expect(api.roles).toHaveBeenCalledOnce());
    v.rerender(node("/partner/history", ["partner"]));
    await waitFor(() => expect(api.roles).toHaveBeenCalledTimes(2));
    await act(async () => old.resolve({ roles: [result === "allowed" ? "parent" : "student"] }));
    expect(api.read).not.toHaveBeenCalled();
    expect(api.navigate).not.toHaveBeenCalled();
    expect(api.toast).not.toHaveBeenCalled();
    await act(async () => next.resolve({ roles: ["partner"] }));
    await screen.findByText("Protected Payload");
    expect(api.read).toHaveBeenCalledOnce();
  },
);

it("sign-in keeps the local page selection and anchor", () => {
  api.viewer = "";
  window.history.replaceState(null, "", "/family/history?student_id=sample&filter=documents#kept");
  render(
    <RoleGuard path="/family/history">
      <Payload />
    </RoleGuard>,
  );
  const target = new URL(
    screen.getByRole("link", { name: "Sign In" }).getAttribute("href")!,
    window.location.origin,
  );
  expect(target.pathname).toBe("/login");
  expect(target.searchParams.get("redirect")).toBe(
    "/family/history?student_id=sample&filter=documents#kept",
  );
  expect(api.roles).not.toHaveBeenCalled();
  expect(api.read).not.toHaveBeenCalled();
});

it.each(roleCases)("$role keeps one main landmark inside a page shell during access checking and retry", async ({ role, path }) => {
  const check = pending();
  api.roles.mockReturnValueOnce(check.promise).mockResolvedValueOnce({ roles: [role] });
  render(<main data-testid="page-main"><MainLandmarkContext.Provider value={true}><RoleGuard path={path}><Payload /></RoleGuard></MainLandmarkContext.Provider></main>);
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(document.querySelectorAll("[data-testid]")).toHaveLength(1);
  expect(api.read).not.toHaveBeenCalled();
  await act(async () => check.reject(new Error("unavailable")));
  await screen.findByRole("alert");
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(document.querySelectorAll("[data-testid]")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
  await screen.findByText("Protected Payload");
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(api.read).toHaveBeenCalledOnce();
});
