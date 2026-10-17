// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  roles: vi.fn(),
  admin: vi.fn(),
  user: { id: "synthetic-viewer" } as { id: string } | null,
  loading: false,
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mocks.user, loading: mocks.loading }),
}));
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
  mocks.user = { id: "synthetic-viewer" };
  mocks.loading = false;
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

describe("return link viewer lifetime", () => {
  it("waits for auth, removes old destinations and scopes both readers", async () => {
    const view = render(<BackToDashboard />);
    await screen.findByRole("link", { name: "Back to Dashboard" });
    expect(mocks.roles).toHaveBeenCalledWith({ data: { expected_viewer_id: "synthetic-viewer" } });
    expect(mocks.admin).toHaveBeenCalledWith({ data: { expected_viewer_id: "synthetic-viewer" } });
    mocks.loading = true;
    view.rerender(<BackToDashboard />);
    expect(screen.getByRole("link", { name: "Back to workspace" }).getAttribute("href")).toBe(
      "/dashboard",
    );
    expect(mocks.roles).toHaveBeenCalledTimes(1);
    mocks.loading = false;
    mocks.user = { id: "next" };
    mocks.roles.mockResolvedValue({ roles: ["partner"] });
    view.rerender(<BackToDashboard />);
    await screen.findByRole("link", { name: "Back to Partner Dashboard" });
    expect(mocks.roles).toHaveBeenLastCalledWith({ data: { expected_viewer_id: "next" } });
    mocks.user = null;
    view.rerender(<BackToDashboard />);
    expect(screen.queryByRole("link", { name: "Back to Partner Dashboard" })).toBeNull();
  });
  it("ignores a departed Owner result even after returning to the original viewer", async () => {
    let finish!: (value: any) => void;
    mocks.admin
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue({ isPlatformAdmin: false });
    const view = render(<BackToDashboard />);
    mocks.user = { id: "other" };
    view.rerender(<BackToDashboard />);
    await screen.findByRole("link", { name: "Back to Dashboard" });
    mocks.user = { id: "synthetic-viewer" };
    view.rerender(<BackToDashboard />);
    await screen.findByRole("link", { name: "Back to Dashboard" });
    await act(async () => {
      finish({ isPlatformAdmin: true });
    });
    expect(screen.queryByRole("link", { name: "Back to Owner Hub" })).toBeNull();
  });
  it.each([{}, { isPlatformAdmin: "false" }])(
    "keeps malformed Owner responses neutral %#",
    async (value) => {
      mocks.admin.mockResolvedValue(value);
      mocks.roles.mockResolvedValue({ roles: ["teacher"] });
      render(<BackToDashboard />);
      await act(async () => {});
      expect(screen.getByRole("link", { name: "Back to workspace" }).getAttribute("href")).toBe(
        "/dashboard",
      );
    },
  );
  it.each([{}, { roles: null }, { roles: ["teacher", null] }])(
    "keeps malformed planning responses neutral %#",
    async (value) => {
      mocks.roles.mockResolvedValue(value);
      render(<BackToDashboard />);
      await act(async () => {});
      expect(screen.getByRole("link", { name: "Back to workspace" }).getAttribute("href")).toBe(
        "/dashboard",
      );
    },
  );
});
