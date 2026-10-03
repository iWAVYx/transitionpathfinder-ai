// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ roles: vi.fn(), owner: vi.fn(), assurance: vi.fn(), user: { id: "synthetic-owner" } }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ useLocation: () => ({ pathname: "/calendar", searchStr: "" }) }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: mocks.user, signOut: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { mfa: { getAuthenticatorAssuranceLevel: mocks.assurance } } } }));
vi.mock("@/lib/profile.functions", () => ({ getMyRoles: mocks.roles }));
vi.mock("@/lib/owner/owner.functions", () => ({ getMyAdminRoles: mocks.owner }));
vi.mock("@/components/site/NotificationsBell", () => ({ NotificationsBell: () => null }));
vi.mock("@/components/brand/BrandLogo", () => ({ BrandLogo: () => <span>Brand</span> }));
vi.mock("@/components/site/SmartLink", () => ({ SmartLink: ({ to, children, activeProps, reload, ...props }: any) => <a href={to} {...props}>{children}</a> }));
import { SiteHeader } from "../../src/components/site/SiteHeader";
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.assurance.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" } });
});
describe("shared header workspace identity", () => {
  it("does not expose a planning return link while an owner's lookup is pending", async () => {
    let resolveOwner!: (value: any) => void;
    mocks.roles.mockResolvedValue({ roles: ["parent"] });
    mocks.owner.mockReturnValue(new Promise(resolve => { resolveOwner = resolve; }));
    render(<SiteHeader />);
    await vi.waitFor(() => expect(mocks.roles).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Back to Dashboard" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tools" })).toBeNull();
    resolveOwner({ isPlatformAdmin: true });
    expect((await screen.findByRole("link", { name: "Back to Owner Hub" })).getAttribute("href")).toBe("/owner");
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
    expect((await screen.findByRole("link", { name: `Back to ${label}` })).getAttribute("href")).toBe(path);
  });
  it("keeps an unverified owner on the guarded entry instead of guessing educator", async () => {
    mocks.roles.mockResolvedValue({ roles: ["teacher"] });
    mocks.owner.mockRejectedValue(new Error("unavailable"));
    render(<SiteHeader />);
    expect((await screen.findByRole("link", { name: "Back to Dashboard" })).getAttribute("href")).toBe("/dashboard");
    expect(screen.queryByRole("link", { name: "Back to Educator Dashboard" })).toBeNull();
  });
});
