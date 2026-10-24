// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  viewer: "owner-a" as string | null,
  loading: false,
  pathname: "/owner",
  roles: vi.fn(),
  navigate: vi.fn(),
  invalidate: vi.fn(),
  mount: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => api.navigate,
  useLocation: () => ({ pathname: api.pathname }),
  useRouter: () => ({ invalidate: api.invalidate }),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: api.viewer ? { id: api.viewer } : null, loading: api.loading }),
}));
vi.mock("@/lib/owner/owner.functions", () => ({ getMyAdminRoles: api.roles }));
vi.mock("@/components/brand/BrandLogo", () => ({ BrandLogo: () => <span>Brand</span> }));
import { OwnerShell } from "@/components/owner/OwnerShell";
function PrivateChild() {
  api.mount();
  return <p>Private Owner Content</p>;
}
function View() {
  return (
    <OwnerShell title="Website Management" actions={<button>Private Owner Action</button>}>
      <PrivateChild />
    </OwnerShell>
  );
}
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.viewer = "owner-a";
  api.loading = false;
  api.pathname = "/owner";
  api.roles.mockResolvedValue({ isPlatformAdmin: true });
  api.navigate.mockResolvedValue(undefined);
});
describe("Owner Hub access lifetime", () => {
  it("waits for settled sign-in and checks the current viewer before mounting management", async () => {
    api.loading = true;
    const view = render(<View />);
    expect(screen.getByRole("main").getAttribute("data-auth-state")).toBe("checking");
    expect(api.roles).not.toHaveBeenCalled();
    expect(api.mount).not.toHaveBeenCalled();
    api.loading = false;
    const pending = deferred();
    api.roles.mockReturnValue(pending.promise);
    view.rerender(<View />);
    expect(screen.queryByText("Private Owner Content")).toBeNull();
    expect(api.roles).toHaveBeenCalledWith({ data: { expected_viewer_id: "owner-a" } });
    await act(async () => pending.resolve({ isPlatformAdmin: true }));
    expect(screen.getByText("Private Owner Content")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Private Owner Action" })).toBeTruthy();
  });
  it.each([
    "parent",
    "student",
    "teacher",
    "school_admin",
    "district_admin",
    "partner",
    "support_admin",
    "content_manager",
  ])("does not mount management for a non-platform %s account", async (role) => {
    api.roles.mockResolvedValue({ roles: [role], isPlatformAdmin: false });
    render(<View />);
    await vi.waitFor(() =>
      expect(api.navigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true }),
    );
    expect(api.mount).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Private Owner Action" })).toBeNull();
  });
  it.each([undefined, null, {}, { isPlatformAdmin: "true" }, { isPlatformAdmin: 1 }])(
    "fails closed with retry for malformed access metadata %#",
    async (result) => {
      api.roles.mockResolvedValue(result);
      render(<View />);
      await screen.findByRole("button", { name: /Try Again/ });
      expect(api.mount).not.toHaveBeenCalled();
      expect(api.navigate).not.toHaveBeenCalled();
    },
  );
  it("rechecks access on retry without exposing protected actions during the request", async () => {
    api.roles.mockRejectedValueOnce(new Error("Private backend detail"));
    const view = render(<View />);
    const retry = await screen.findByRole("button", { name: /Try Again/ });
    expect(document.body.textContent).not.toContain("Private backend detail");
    const pending = deferred();
    api.roles.mockReturnValueOnce(pending.promise);
    fireEvent.click(retry);
    expect(screen.queryByText("Private Owner Content")).toBeNull();
    expect(api.mount).not.toHaveBeenCalled();
    await act(async () => pending.resolve({ isPlatformAdmin: true }));
    await screen.findByText("Private Owner Content");
    view.rerender(<View />);
    expect(api.roles).toHaveBeenCalledTimes(2);
  });
  it.each(["account", "loading", "signout", "path"])(
    "immediately removes an allowed workspace on %s change",
    async (change) => {
      const view = render(<View />);
      await screen.findByText("Private Owner Content");
      api.roles.mockReturnValue(new Promise(() => {}));
      if (change === "account") api.viewer = "owner-b";
      if (change === "loading") api.loading = true;
      if (change === "signout") api.viewer = null;
      if (change === "path") api.pathname = "/owner/content";
      view.rerender(<View />);
      expect(screen.queryByText("Private Owner Content")).toBeNull();
      expect(screen.queryByRole("button", { name: "Private Owner Action" })).toBeNull();
      expect(screen.getByRole("main")).toBeTruthy();
    },
  );
  it.each(["allowed", "denied", "error"])(
    "ignores departed %s results across A-to-B-to-A",
    async (outcome) => {
      const old = deferred();
      api.roles.mockReturnValueOnce(old.promise).mockResolvedValue({ isPlatformAdmin: false });
      const view = render(<View />);
      api.viewer = "owner-b";
      view.rerender(<View />);
      await vi.waitFor(() => expect(api.navigate).toHaveBeenCalledTimes(1));
      api.viewer = "owner-a";
      const current = deferred();
      api.roles.mockReturnValueOnce(current.promise);
      view.rerender(<View />);
      await act(async () => {
        if (outcome === "error") old.reject(new Error("Departed error"));
        else old.resolve({ isPlatformAdmin: outcome === "allowed" });
      });
      expect(api.mount).not.toHaveBeenCalled();
      expect(api.navigate).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("button", { name: /Try Again/ })).toBeNull();
      await act(async () => current.resolve({ isPlatformAdmin: true }));
      await screen.findByText("Private Owner Content");
    },
  );
  it("offers recovery when a non-Owner return navigation fails", async () => {
    api.roles.mockResolvedValue({ isPlatformAdmin: false });
    api.navigate.mockRejectedValueOnce(new Error("Private navigation error"));
    render(<View />);
    const retry = await screen.findByRole("button", { name: /Try Again/ });
    expect(api.mount).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("Private navigation error");
    api.roles.mockResolvedValueOnce({ isPlatformAdmin: true });
    fireEvent.click(retry);
    await screen.findByText("Private Owner Content");
  });
  it("does not redirect on a lookup error and ignores completion after unmount", async () => {
    const pending = deferred();
    api.roles.mockReturnValue(pending.promise);
    const view = render(<View />);
    view.unmount();
    await act(async () => pending.resolve({ isPlatformAdmin: false }));
    expect(api.navigate).not.toHaveBeenCalled();
    expect(api.mount).not.toHaveBeenCalled();
  });
});
