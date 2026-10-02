// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  usage: vi.fn(),
  withdraw: vi.fn(),
  navigate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => ({
    ...options,
    id: "opportunities",
    useNavigate: () => mocks.navigate,
  }),
  useSearch: () => ({ status: "pending_review" }),
  Link: ({ to, search, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => children }));
vi.mock("@/lib/route-role-guard", () => ({ ensureRoleAccess: vi.fn() }));
vi.mock("@/components/partners/TierUsageMeter", () => ({ TierUsageMeter: () => null }));
vi.mock("@/components/partners/OpportunityEditDialog", () => ({
  OpportunityEditDialog: () => null,
}));
vi.mock("@/lib/partner-tier-usage.functions", () => ({ getPartnerTierUsage: mocks.usage }));
vi.mock("@/lib/partner-workspace.functions", () => ({
  getPartnerWorkspace: mocks.load,
  updateOpportunity: vi.fn(),
  deleteOpportunity: vi.fn(),
  withdrawOpportunityForEditing: mocks.withdraw,
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
import { Route } from "../../src/routes/_authenticated/partners-manage_.opportunities";
const Page = (Route as unknown as { component: () => React.ReactNode }).component;
const row = {
  id: "listing",
  title: "Community program",
  description: "Details",
  opportunity_type: "community_resource",
  status: "pending_review",
  updated_at: "2026-10-02T12:00:00Z",
};
const workspace = { is_partner: true, selected_org: { id: "org" }, opportunities: [row] };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.load.mockResolvedValue(workspace);
  mocks.usage.mockResolvedValue(null);
  mocks.withdraw.mockResolvedValue({ ok: true });
});
afterEach(cleanup);
it("withdraws the displayed revision, reloads and opens Drafts", async () => {
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "Withdraw to draft" }));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ search: { status: "draft" } }));
  expect(mocks.withdraw).toHaveBeenCalledWith({
    data: { id: row.id, expected_updated_at: row.updated_at },
  });
  expect(mocks.load).toHaveBeenCalledTimes(2);
});
it("keeps the list available when withdrawal fails", async () => {
  mocks.withdraw.mockRejectedValue(new Error("Listing changed. Refresh the list."));
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "Withdraw to draft" }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith("Listing changed. Refresh the list."),
  );
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Refresh list" })).toBeTruthy();
});
it("shows a retryable load error instead of an organization setup prompt", async () => {
  mocks.load.mockRejectedValueOnce(new Error("Network unavailable"));
  render(<Page />);
  expect((await screen.findByRole("alert")).textContent).toBe("Network unavailable");
  expect(screen.queryByText("Set up your partner organization first")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Community program")).toBeTruthy();
});
