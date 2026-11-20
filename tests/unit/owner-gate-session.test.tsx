// @vitest-environment jsdom
import { useEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({
  owner: vi.fn(),
  navigate: vi.fn(),
  read: vi.fn(),
  unmount: vi.fn(),
  viewer: "caller",
  loading: false,
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => api.navigate }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: api.viewer ? { id: api.viewer } : null, loading: api.loading }),
}));
vi.mock("@/lib/owner/owner.functions", () => ({ getMyAdminRoles: api.owner }));
vi.mock("@/components/site/SiteShell", () => ({
  SiteShell: ({ children }: any) => <main>{children}</main>,
}));
import { OwnerWorkspaceGate } from "@/components/dashboard/OwnerWorkspaceGate";
function Payload() {
  useEffect(() => {
    api.read(api.viewer);
    return () => {
      api.unmount();
    };
  }, []);
  return <p>Family Payload</p>;
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
const node = () => (
  <OwnerWorkspaceGate>
    <Payload />
  </OwnerWorkspaceGate>
);
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  api.viewer = "caller";
  api.loading = false;
});
it.each(["student", "parent", "educator", "school_admin", "district_admin", "partner"])(
  "%s opens only after a confirmed non-Owner result",
  async (role) => {
    api.viewer = role;
    const old = pending();
    api.owner.mockReturnValueOnce(old.promise);
    render(node());
    expect(api.read).not.toHaveBeenCalled();
    await act(async () => old.resolve({ isPlatformAdmin: false }));
    await screen.findByText("Family Payload");
    expect(api.owner).toHaveBeenCalledWith({ data: { expected_viewer_id: role } });
    expect(api.read).toHaveBeenCalledWith(role);
    expect(api.navigate).not.toHaveBeenCalled();
  },
);
it.each([true, false])(
  "waits for settled auth before any Owner read (loading %s)",
  async (loading) => {
    api.loading = loading;
    if (!loading) api.viewer = "";
    const v = render(node());
    expect(api.owner).not.toHaveBeenCalled();
    expect(api.read).not.toHaveBeenCalled();
    api.loading = false;
    api.viewer = "caller";
    api.owner.mockResolvedValue({ isPlatformAdmin: false });
    v.rerender(node());
    await screen.findByText("Family Payload");
  },
);
it.each(["owner", "non-owner", "failure"])(
  "ignores a departed account's %s result",
  async (result) => {
    const old = pending();
    const next = pending();
    api.owner.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const v = render(node());
    await waitFor(() => expect(api.owner).toHaveBeenCalledOnce());
    api.viewer = "other";
    v.rerender(node());
    await waitFor(() => expect(api.owner).toHaveBeenCalledTimes(2));
    await act(async () =>
      result === "failure"
        ? old.reject(new Error("old"))
        : old.resolve({ isPlatformAdmin: result === "owner" }),
    );
    expect(api.read).not.toHaveBeenCalled();
    expect(api.navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => next.resolve({ isPlatformAdmin: false }));
    await screen.findByText("Family Payload");
    expect(api.read).toHaveBeenCalledWith("other");
  },
);
it.each(["account", "loading", "signed-out"])(
  "removes a previously allowed child on %s before another check",
  async (state) => {
    api.owner.mockResolvedValueOnce({ isPlatformAdmin: false });
    const v = render(node());
    await screen.findByText("Family Payload");
    const next = pending();
    api.owner.mockReturnValueOnce(next.promise);
    if (state === "account") api.viewer = "other";
    else if (state === "loading") api.loading = true;
    else api.viewer = "";
    v.rerender(node());
    expect(screen.queryByText("Family Payload")).toBeNull();
    expect(api.unmount).toHaveBeenCalledOnce();
    api.loading = false;
    api.viewer = "other";
    v.rerender(node());
    await act(async () => next.resolve({ isPlatformAdmin: true }));
    await waitFor(() => expect(api.navigate).toHaveBeenCalledWith({ to: "/owner", replace: true }));
    expect(screen.queryByText("Family Payload")).toBeNull();
  },
);
it.each([null, {}, { isPlatformAdmin: "false" }])(
  "malformed Owner response never opens Family: %j",
  async (result) => {
    api.owner.mockResolvedValue(result);
    render(node());
    await screen.findByRole("alert");
    expect(api.read).not.toHaveBeenCalled();
    expect(api.navigate).not.toHaveBeenCalled();
  },
);
it("failed Owner navigation retries the check without mounting Family", async () => {
  api.owner.mockResolvedValue({ isPlatformAdmin: true });
  api.navigate.mockRejectedValueOnce(new Error("failed"));
  render(node());
  await screen.findByRole("alert");
  expect(api.read).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Try again"));
  await waitFor(() => expect(api.navigate).toHaveBeenCalledTimes(2));
  expect(api.owner).toHaveBeenCalledTimes(2);
  expect(api.read).not.toHaveBeenCalled();
});
it.each([false, true])(
  "unmounted Owner checks cannot open or redirect (failure %s)",
  async (failure) => {
    const old = pending();
    api.owner.mockReturnValueOnce(old.promise);
    const v = render(node());
    await waitFor(() => expect(api.owner).toHaveBeenCalledOnce());
    v.unmount();
    await act(async () =>
      failure ? old.reject(new Error("old")) : old.resolve({ isPlatformAdmin: true }),
    );
    expect(api.navigate).not.toHaveBeenCalled();
    expect(api.read).not.toHaveBeenCalled();
  },
);
