// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  roles: vi.fn(),
  owner: vi.fn(),
  assurance: vi.fn(),
  user: { id: "synthetic-owner" } as { id: string } | null,
  loading: false,
  pathname: "/calendar",
  origin: null as null | { to: string; label: string; go: () => void },
}));
vi.mock("@/components/navigation/NavigationOriginProvider", async importOriginal => ({
  ...await importOriginal<typeof import("@/components/navigation/NavigationOriginProvider")>(),
  useNavigationOrigin: () => mocks.origin,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: mocks.pathname, searchStr: "" }),
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
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
vi.mock("@/components/site/SiteFooter", () => ({ SiteFooter: () => null }));
import { SiteShell } from "../../src/components/site/SiteShell";
import { BackToDashboard } from "../../src/components/dashboard/BackToDashboard";
import { FeatureShell } from "../../src/components/feature/FeatureShell";
import { LockedFeature } from "../../src/components/LockedFeature";
import { SiteHeader } from "../../src/components/site/SiteHeader";
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user = { id: "synthetic-owner" };
  mocks.loading = false;
  mocks.pathname = "/calendar";
  mocks.origin = null;
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


describe("one dashboard return per shared page", () => {
  it.each([
    ["student", false, "Dashboard", "/dashboard"],
    ["parent", false, "Dashboard", "/dashboard"],
    ["teacher", false, "Educator Dashboard", "/caseload"],
    ["school_admin", false, "School Dashboard", "/school/overview"],
    ["district_admin", false, "District Dashboard", "/district/overview"],
    ["partner", false, "Partner Dashboard", "/partners-manage"],
    ["parent", true, "Owner Hub", "/owner"],
  ])("keeps one correct return for %s / owner %s", async (role, owner, label, to) => {
    mocks.roles.mockResolvedValue({ roles: [role] });
    mocks.owner.mockResolvedValue({ isPlatformAdmin: owner });
    render(<SiteShell><BackToDashboard /><p>Tool content</p></SiteShell>);
    const link = await screen.findByRole("link", { name: `Back to ${label}` });
    expect(link.getAttribute("href")).toBe(to);
    expect(screen.getAllByRole("link", { name: /^Back to / })).toHaveLength(1);
  });
  it("keeps FeatureShell and locked states from adding duplicate home returns", async () => {
    mocks.roles.mockResolvedValue({ roles: ["parent"] });
    mocks.owner.mockResolvedValue({ isPlatformAdmin: false });
    render(<FeatureShell title="Tool" backTo={{to:"/dashboard",label:"Back to Dashboard"}}>
      <LockedFeature title="Unavailable" description="Try again later" />
    </FeatureShell>);
    await screen.findByRole("link", {name:"Back to Dashboard"});
    expect(screen.getAllByRole("link", {name:/^Back to /})).toHaveLength(1);
  });
  it("preserves a distinct tool return alongside the dashboard return", async () => {
    mocks.roles.mockResolvedValue({ roles: ["parent"] });
    mocks.owner.mockResolvedValue({ isPlatformAdmin: false });
    render(<FeatureShell title="Report" backTo={{to:"/reports",label:"Back to Reports"}}><p>Report</p></FeatureShell>);
    await screen.findByRole("link", {name:"Back to Dashboard"});
    expect(screen.getByRole("link", {name:"Back to Reports"}).getAttribute("href")).toBe("/reports");
  });
  it("retains a local demo return without a signed-in dashboard strip", async () => {
    mocks.pathname = "/demo/tools/calendar";
    mocks.roles.mockResolvedValue({ roles: ["parent"] });
    mocks.owner.mockResolvedValue({ isPlatformAdmin: false });
    render(<SiteShell><BackToDashboard to="/demo/dashboard" label="Back to Demo Dashboard" /></SiteShell>);
    await act(async () => {});
    expect(screen.getAllByRole("link", {name:/^Back to /})).toHaveLength(1);
    expect(screen.getByRole("link", {name:"Back to Demo Dashboard"}).getAttribute("href")).toBe("/demo/dashboard");
  });
});


describe("contextual return navigation", () => {
  it.each(["parent", "student", "teacher", "school_admin", "district_admin", "partner", "platform_admin"]) (
    "returns %s to Home when that is the real source, without extra tool returns", async role => {
      const go = vi.fn();
      mocks.origin = { to: "/?section=tools#planning", label: "Back to Home", go };
      mocks.roles.mockResolvedValue({ roles: [role] });
      mocks.owner.mockResolvedValue({ isPlatformAdmin: role === "platform_admin" });
      render(<FeatureShell title="Tool" backTo={{ to: "/dashboard", label: "Back to Dashboard" }}><BackToDashboard /><p>Tool</p></FeatureShell>);
      const link = await screen.findByRole("link", { name: "Back to Home" });
      expect(link.getAttribute("href")).toBe("/?section=tools#planning");
      expect(screen.getAllByRole("link", { name: /^Back to / })).toHaveLength(1);
      expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
      fireEvent.click(link);
      expect(go).toHaveBeenCalledOnce();
      fireEvent.click(link, { ctrlKey: true });
      expect(go).toHaveBeenCalledOnce();
    });
  it("shows the real public source even when the visitor is signed out", async () => {
    mocks.user = null;
    mocks.origin = { to: "/", label: "Back to Home", go: vi.fn() };
    render(<SiteShell><p>Public feature</p></SiteShell>);
    expect(await screen.findByRole("link", { name: "Back to Home" })).toBeTruthy();
    expect(mocks.roles).not.toHaveBeenCalled();
  });
  it("does not add a return strip to a dashboard landing page", async () => {
    mocks.pathname = "/dashboard";
    mocks.origin = { to: "/calendar", label: "Back to Calendar", go: vi.fn() };
    render(<SiteShell><p>Preparing Your Dashboard</p></SiteShell>);
    await act(async () => {});
    expect(screen.queryByRole("navigation", { name: "Return to previous page" })).toBeNull();
    expect(document.querySelectorAll('[data-dashboard-landmark="student"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-dashboard-landmark="family"]')).toHaveLength(1);
  });
});


it.each(["/platform", "/pathways/example", "/blog", "/bridgeforward"]) (
  "does not invent a dashboard return on direct public page %s", async path => {
    mocks.pathname = path;
    mocks.roles.mockResolvedValue({ roles: ["parent"] });
    mocks.owner.mockResolvedValue({ isPlatformAdmin: false });
    render(<SiteHeader />);
    await screen.findByRole("button", { name: "Tools" });
    expect(screen.queryByRole("navigation", { name: "Return to previous page" })).toBeNull();
  });
