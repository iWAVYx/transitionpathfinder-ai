// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ roles: vi.fn(), admin: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/profile.functions", () => ({ getMyRoles: mocks.roles }));
vi.mock("@/lib/owner/owner.functions", () => ({ getMyAdminRoles: mocks.admin }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
import { BackToDashboard } from "../../src/components/dashboard/BackToDashboard";

afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.roles.mockResolvedValue({ roles: ["parent"] });
  mocks.admin.mockResolvedValue({ isPlatformAdmin: false });
});

describe("role-aware tool return links", () => {
  it("takes a platform owner with an ordinary family role directly to Owner Hub", async () => {
    mocks.admin.mockResolvedValue({ isPlatformAdmin: true });
    render(<BackToDashboard />);
    expect(
      (await screen.findByRole("link", { name: "Back to Owner Hub" })).getAttribute("href"),
    ).toBe("/owner");
  });
  it("still recognizes an owner when ordinary role lookup fails", async () => {
    mocks.roles.mockRejectedValue(new Error("unavailable"));
    mocks.admin.mockResolvedValue({ isPlatformAdmin: true });
    render(<BackToDashboard />);
    expect(
      (await screen.findByRole("link", { name: "Back to Owner Hub" })).getAttribute("href"),
    ).toBe("/owner");
  });
  it.each([
    ["parent", "Dashboard", "/dashboard"],
    ["student", "Dashboard", "/dashboard"],
    ["teacher", "Educator Dashboard", "/caseload"],
    ["partner", "Partner Dashboard", "/partners-manage"],
    ["school_admin", "School Dashboard", "/school/overview"],
    ["district_admin", "District Dashboard", "/district/overview"],
  ])("returns %s to its existing workspace", async (role, label, destination) => {
    mocks.roles.mockResolvedValue({ roles: [role] });
    render(<BackToDashboard />);
    expect(
      (await screen.findByRole("link", { name: `Back to ${label}` })).getAttribute("href"),
    ).toBe(destination);
  });
  it("uses the guarded entry when owner lookup fails", async () => {
    mocks.roles.mockResolvedValue({ roles: ["teacher"] });
    mocks.admin.mockRejectedValue(new Error("unavailable"));
    render(<BackToDashboard />);
    await vi.waitFor(() => expect(mocks.admin).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "Back to workspace" }).getAttribute("href")).toBe(
      "/dashboard",
    );
  });
  it("uses explicit destinations immediately and preserves custom wording", () => {
    const { rerender } = render(<BackToDashboard to="/owner" />);
    expect(screen.getByRole("link", { name: "Back to Owner Hub" }).getAttribute("href")).toBe(
      "/owner",
    );
    rerender(<BackToDashboard to="/partners-manage" label="Return to organization" />);
    expect(screen.getByRole("link", { name: "Return to organization" }).getAttribute("href")).toBe(
      "/partners-manage",
    );
    expect(mocks.roles).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
  });
});
