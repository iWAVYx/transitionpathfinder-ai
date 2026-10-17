// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ viewer: "viewer-a" as string | null, loading: false, read: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => api.read }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: any) => <span>{children}</span> }));
vi.mock("@/lib/sharing.functions", () => ({ getStudentAccessOverview: {} }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: api.viewer ? { id: api.viewer } : null, loading: api.loading }) }));
import { WhoCanSeeThisPanel } from "@/components/students/WhoCanSeeThisPanel";
const overview = (name: string) => ({ collaborators: [{ kind: "collaborator", id: name, name, email: "sample@example.test", role: "viewer", added_at: "2026-10-01" }], relationships: [], share_links: [] });
beforeEach(() => { api.viewer = "viewer-a"; api.loading = false; api.read.mockReset(); });
afterEach(cleanup);
it("shows failure and retry without falsely claiming zero access", async () => {
  api.read.mockRejectedValueOnce(new Error("Private detail")).mockResolvedValueOnce(overview("Recovered Person"));
  render(<WhoCanSeeThisPanel studentId="student-a" />);
  await screen.findByRole("alert");
  expect(screen.queryByText("No invited collaborators.")).toBeNull();
  expect(screen.queryByText("0 entries")).toBeNull();
  expect(screen.queryByText("Private detail")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
  await screen.findByText("Recovered Person");
  expect(api.read).toHaveBeenLastCalledWith({ data: { student_id: "student-a", expected_viewer_id: "viewer-a" } });
});
it.each(["student", "viewer", "sign-out", "auth-loading"])("clears former rows immediately on %s change and ignores late results", async change => {
  let finish!: (value: any) => void;
  api.read.mockResolvedValueOnce(overview("Previous Person")).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<WhoCanSeeThisPanel studentId="student-a" />);
  await screen.findByText("Previous Person");
  if (change === "viewer") api.viewer = "viewer-b";
  if (change === "sign-out") api.viewer = null;
  if (change === "auth-loading") api.loading = true;
  view.rerender(<WhoCanSeeThisPanel studentId={change === "student" ? "student-b" : "student-a"} />);
  expect(screen.queryByText("Previous Person")).toBeNull();
  if (finish) {
    view.unmount(); await act(async () => { finish(overview("Departed Person")); });
    expect(screen.queryByText("Departed Person")).toBeNull();
  }
});
it("a departed pending request cannot overwrite the new student's access", async () => {
  let finish!: (value: any) => void;
  api.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(overview("Current Person"));
  const view = render(<WhoCanSeeThisPanel studentId="student-a" />);
  view.rerender(<WhoCanSeeThisPanel studentId="student-b" />);
  await screen.findByText("Current Person");
  await act(async () => { finish(overview("Departed Person")); });
  expect(screen.queryByText("Departed Person")).toBeNull(); expect(screen.getByText("Current Person")).toBeTruthy();
});
it("signed-out and loading viewers never start access reads", () => {
  api.viewer = null; const view = render(<WhoCanSeeThisPanel studentId="student-a" />);
  expect(api.read).not.toHaveBeenCalled(); api.loading = true;
  view.rerender(<WhoCanSeeThisPanel studentId="student-a" />); expect(api.read).not.toHaveBeenCalled();
});
