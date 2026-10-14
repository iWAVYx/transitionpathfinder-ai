// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  roles: vi.fn(),
  owner: vi.fn(),
  assurance: vi.fn(),
  user: { id: "synthetic-owner" } as { id: string } | null,
  loading: false,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/calendar", searchStr: "" }),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mocks.user, loading: mocks.loading, signOut: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { mfa: { getAuthenticatorAssuranceLevel: mocks.assurance } } },
}));
vi.mock("@/lib/profile.functions", () => ({ getMyRoles: mocks.roles }));
vi.mock("@/lib/owner/owner.functions", () => ({ getMyAdminRoles: mocks.owner }));
vi.mock("@/components/site/NotificationsBell", () => ({ NotificationsBell: () => null }));
vi.mock("@/components/brand/BrandLogo", () => ({ BrandLogo: () => <span>Brand</span> }));
vi.mock("@/components/site/SmartLink", () => ({
  SmartLink: ({ to, children, activeProps, reload, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
import { SiteHeader } from "../../src/components/site/SiteHeader";
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user = { id: "synthetic-owner" };
  mocks.loading = false;
  mocks.assurance.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" } });
});
describe("shared header workspace identity", () => {
  it("does not expose a planning return link while an owner's lookup is pending", async () => {
    let resolveOwner!: (value: any) => void;
    mocks.roles.mockResolvedValue({ roles: ["parent"] });
    mocks.owner.mockReturnValue(
      new Promise((resolve) => {
        resolveOwner = resolve;
      }),
    );
    render(<SiteHeader />);
    await vi.waitFor(() => expect(mocks.roles).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Back to Dashboard" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tools" })).toBeNull();
    resolveOwner({ isPlatformAdmin: true });
    expect(
      (await screen.findByRole("link", { name: "Back to Owner Hub" })).getAttribute("href"),
    ).toBe("/owner");
    expect(screen.queryByRole("link", { name: "Back to Dashboard" })).toBeNull();
  });
  it.each([
    ["student", "Dashboard", "/dashboard"],
    ["parent", "Dashboard", "/dashboard"],
    ["teacher", "Educator Dashboard", "/caseload"],
    ["school_admin", "School Dashboard", "/school/overview"],
    ["district_admin", "District Dashboard", "/district/overview"],
    ["partner", "Partner Dashboard", "/partners-manage"],
  ])("resolves %s through the same shared return policy", async (role, label, path) => {
    mocks.roles.mockResolvedValue({ roles: [role] });
    mocks.owner.mockResolvedValue({ isPlatformAdmin: false });
    render(<SiteHeader />);
    expect(
      (await screen.findByRole("link", { name: `Back to ${label}` })).getAttribute("href"),
    ).toBe(path);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const mobile = screen.getByRole("navigation", { name: "Return to workspace" });
    expect(mobile.querySelector("a")?.getAttribute("href")).toBe(path);
    expect(mobile.textContent).toBe(label);
  });
  it("keeps an unverified owner on the guarded entry instead of guessing educator", async () => {
    mocks.roles.mockResolvedValue({ roles: ["teacher"] });
    mocks.owner.mockRejectedValue(new Error("unavailable"));
    render(<SiteHeader />);
    expect(
      (await screen.findByRole("link", { name: "Back to workspace" })).getAttribute("href"),
    ).toBe("/dashboard");
    expect(screen.queryByRole("link", { name: "Back to Educator Dashboard" })).toBeNull();
  });
});

describe("header session and assurance boundaries", () => {
  it.each([
    { data: null },
    { data: { currentLevel: "aal1", nextLevel: "aal1" }, error: new Error("failed") },
    { data: { currentLevel: "unknown", nextLevel: "aal1" } },
    { data: { currentLevel: "aal1", nextLevel: null } },
    { data: { currentLevel: "aal1", nextLevel: "aal2" } },
  ])("hides signed-in navigation for incomplete or challenged MFA %#", async (result) => {
    mocks.roles.mockResolvedValue({ roles: ["parent"] });
    mocks.owner.mockResolvedValue({ isPlatformAdmin: true });
    mocks.assurance.mockResolvedValue(result);
    render(<SiteHeader />);
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "Tools" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to Owner Hub" })).toBeNull();
  });
  it("waits for auth and sends both lookups the current viewer intent", async () => {
    mocks.loading = true;
    mocks.roles.mockResolvedValue({ roles: ["teacher"] });
    mocks.owner.mockResolvedValue({ isPlatformAdmin: false });
    const view = render(<SiteHeader />);
    expect(mocks.roles).not.toHaveBeenCalled();
    expect(mocks.owner).not.toHaveBeenCalled();
    expect(mocks.assurance).not.toHaveBeenCalled();
    mocks.loading = false;
    view.rerender(<SiteHeader />);
    await screen.findByRole("link", { name: "Back to Educator Dashboard" });
    const intent = { data: { expected_viewer_id: "synthetic-owner" } };
    expect(mocks.roles).toHaveBeenCalledWith(intent);
    expect(mocks.owner).toHaveBeenCalledWith(intent);
    view.rerender(<SiteHeader />);
    expect(mocks.roles).toHaveBeenCalledTimes(1);
  });
  it("removes old Owner links immediately and ignores departed lookup/MFA results", async () => {
    let resolveOwner!: (value: any) => void;
    let resolveMfa!: (value: any) => void;
    mocks.roles.mockResolvedValue({ roles: ["parent"] });
    mocks.owner
      .mockResolvedValueOnce({ isPlatformAdmin: true })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOwner = resolve;
          }),
      )
      .mockResolvedValue({ isPlatformAdmin: false });
    mocks.assurance
      .mockResolvedValueOnce({ data: { currentLevel: "aal2", nextLevel: "aal2" } })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveMfa = resolve;
          }),
      )
      .mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" } });
    const view = render(<SiteHeader />);
    await screen.findByRole("link", { name: "Back to Owner Hub" });
    mocks.user = { id: "second" };
    view.rerender(<SiteHeader />);
    expect(screen.queryByRole("link", { name: "Back to Owner Hub" })).toBeNull();
    mocks.user = { id: "third" };
    mocks.roles.mockResolvedValue({ roles: ["partner"] });
    view.rerender(<SiteHeader />);
    await screen.findByRole("link", { name: "Back to Partner Dashboard" });
    await act(async () => {
      resolveOwner({ isPlatformAdmin: true });
      resolveMfa({ data: { currentLevel: "aal2", nextLevel: "aal2" } });
    });
    expect(screen.queryByRole("link", { name: "Back to Owner Hub" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("navigation", { name: "Return to workspace" }).textContent).toContain(
      "Partner Dashboard",
    );
    expect(screen.queryByText("Owner Hub")).toBeNull();
  });
  it.each([{}, { isPlatformAdmin: "true" }])(
    "does not infer Owner status from malformed metadata %#",
    async (owner) => {
      mocks.roles.mockResolvedValue({ roles: ["teacher"] });
      mocks.owner.mockResolvedValue(owner);
      render(<SiteHeader />);
      expect(
        (await screen.findByRole("link", { name: "Back to workspace" })).getAttribute("href"),
      ).toBe("/dashboard");
      expect(screen.queryByRole("link", { name: "Back to Educator Dashboard" })).toBeNull();
    },
  );
});
