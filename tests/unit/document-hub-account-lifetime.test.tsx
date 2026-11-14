// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ user: { id: "00000000-0000-4000-8000-000000000001" } as { id: string } | null, loading: false, list: vi.fn(), rescan: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: api.user, loading: api.loading }) }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: any) => ({ options }), Link: ({ children, to }: any) => <a href={to}>{children}</a> }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@/components/RoutePageOutlet", () => ({ RoutePageOutlet: ({ children }: any) => children }));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => children }));
vi.mock("@/lib/route-role-guard", () => ({ ensureRoleAccess: vi.fn() }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/documents/MissingDocumentsChecklist", () => ({ MissingDocumentsChecklist: () => null }));
vi.mock("@/components/documents/DocumentReadinessMeter", () => ({ DocumentReadinessMeter: () => null }));
vi.mock("@/components/empty/IllustratedEmptyState", () => ({ IllustratedEmptyState: () => null }));
vi.mock("@/components/permissions/VisibilityBadge", () => ({ VisibilityBadge: () => null, PermissionLabel: () => null }));
vi.mock("@/lib/cross-docs.functions", () => ({ listAllDocuments: api.list }));
vi.mock("@/lib/documents.functions", () => ({ rescanDocument: api.rescan }));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error } }));
import { Route } from "../../src/routes/_authenticated/documents";
const Page = (Route as any).options.component;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (title = "Private first account") => ({ id: id(3), student_id: id(4), student_first_name: "Fictional", doc_type: "other", title, mime_type: "text/plain", size_bytes: 20, has_summary: false, review_status: "uploaded", scan_status: "failed", created_at: "2026-10-30T12:00:00Z" });
beforeEach(() => { vi.clearAllMocks(); api.user = { id: id(1) }; api.loading = false; api.list.mockResolvedValue({ documents: [row()] }); api.rescan.mockResolvedValue({ ok: true }); });
afterEach(cleanup);
it("sends the account that loaded the list with the selected failed document", async () => {
  render(<Page />); await screen.findByText("Private first account"); fireEvent.click(screen.getByRole("button", { name: /retry scan/i }));
  await waitFor(() => expect(api.rescan).toHaveBeenCalledWith({ data: { id: id(3), expected_viewer_id: id(1) } }));
});
it("hides old rows immediately on an account switch", async () => {
  const view = render(<Page />); await screen.findByText("Private first account"); api.list.mockReturnValueOnce(new Promise(() => {})); api.user = { id: id(2) }; view.rerender(<Page />);
  expect(screen.queryByText("Private first account")).toBeNull(); expect(screen.queryByRole("button", { name: /retry scan/i })).toBeNull();
});
it.each(["success", "error"])("ignores a departed rescan %s without toast or reloading the next account", async outcome => {
  let finish!: () => void; api.rescan.mockReturnValueOnce(new Promise((resolve, reject) => { finish = () => outcome === "success" ? resolve({ ok: true }) : reject(new Error("Old account error")); }));
  const view = render(<Page />); await screen.findByText("Private first account"); fireEvent.click(screen.getByRole("button", { name: /retry scan/i }));
  api.list.mockResolvedValueOnce({ documents: [row("Current second account")] }); api.user = { id: id(2) }; view.rerender(<Page />); await screen.findByText("Current second account");
  const listCalls = api.list.mock.calls.length; await act(async () => finish());
  expect(api.success).not.toHaveBeenCalled(); expect(api.error).not.toHaveBeenCalled(); expect(api.list).toHaveBeenCalledTimes(listCalls); expect(screen.getByText("Current second account")).toBeTruthy();
});
it("ignores a departed list response after leaving and returning to the same account", async () => {
  let old!: (v: any) => void; api.list.mockReturnValueOnce(new Promise(resolve => { old = resolve; })); const view = render(<Page />);
  api.user = { id: id(2) }; api.list.mockResolvedValueOnce({ documents: [row("Second account")] }); view.rerender(<Page />); await screen.findByText("Second account");
  api.user = { id: id(1) }; api.list.mockResolvedValueOnce({ documents: [row("Fresh first account")] }); view.rerender(<Page />); await screen.findByText("Fresh first account");
  await act(async () => old({ documents: [row("Stale private response")] })); expect(screen.queryByText("Stale private response")).toBeNull(); expect(screen.getByText("Fresh first account")).toBeTruthy();
});
it("does not request private rows while authentication is unsettled", async () => { api.loading = true; render(<Page />); expect(api.list).not.toHaveBeenCalled(); });
