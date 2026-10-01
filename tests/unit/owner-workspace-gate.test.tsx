// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), navigate: vi.fn(), user: { id: "owner" } }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.fetch }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/lib/owner/owner.functions", () => ({ getMyAdminRoles: vi.fn() }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({children}: any) => children }));
import { OwnerWorkspaceGate } from "@/components/dashboard/OwnerWorkspaceGate";
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
describe("owner dashboard routing", () => {
  it("redirects verified owners without mounting the family dashboard", async () => {
    mocks.fetch.mockResolvedValue({ isPlatformAdmin: true });
    render(<OwnerWorkspaceGate><p>Family content</p></OwnerWorkspaceGate>);
    expect(screen.queryByText('Family content')).toBeNull();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({to:'/owner',replace:true}));
    expect(screen.queryByText('Family content')).toBeNull();
  });
  it("allows the dashboard after confirming the user is not a platform admin", async () => {
    mocks.fetch.mockResolvedValue({ isPlatformAdmin: false });
    render(<OwnerWorkspaceGate><p>Family content</p></OwnerWorkspaceGate>);
    expect(await screen.findByText('Family content')).toBeTruthy();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("keeps family content hidden on failure and supports retry", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({isPlatformAdmin:true});
    render(<OwnerWorkspaceGate><p>Family content</p></OwnerWorkspaceGate>);
    fireEvent.click(await screen.findByText('Try again'));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({to:'/owner',replace:true}));
    expect(screen.queryByText('Family content')).toBeNull();
  });
});
