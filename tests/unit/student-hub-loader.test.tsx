// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const api = vi.hoisted(() => ({
  context: vi.fn(),
  snapshot: vi.fn(),
  viewer: "caller",
  loading: false,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: api.viewer ? { id: api.viewer } : null, loading: api.loading }),
}));
vi.mock("@/lib/dashboard/student-hub-context.functions", () => ({
  getStudentHubContext: api.context,
}));
vi.mock("@/lib/golden-path.functions", () => ({ getDashboardSnapshot: api.snapshot }));
vi.mock("@/components/dashboard/DashboardWidgetBoard", () => ({
  DashboardWidgetBoard: ({ role, studentId }: any) => (
    <p>
      Widgets {role} {studentId}
    </p>
  ),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));
vi.mock("@/components/dashboard/LiveToolPreviewDrawer", () => ({
  LiveToolPreviewDrawer: () => null,
}));
vi.mock("@/components/dashboard/ToolPreviewCard", () => ({
  ToolPreviewCard: () => null,
  ToolPreviewGrid: ({ children }: any) => <div>{children}</div>,
  ToolPreviewSection: ({ children }: any) => <div>{children}</div>,
}));
import { LiveStudentWorkspaceLoader } from "@/components/dashboard/LiveStudentWorkspaceOverview";
const context = (student = "selected", viewer = "caller") => ({
  student_id: student,
  viewer_id: viewer,
  management_only: false,
  connection_status: "ready",
});
const snapshot = (student = "selected") => ({
  student: {
    id: student,
    first_name: "Sample Student",
    last_name: "",
    preferred_name: null,
    grade_band: null,
    school: null,
    student_voice_statement: null,
  },
  goals: [],
  actionItems: [],
  meetingPrep: [],
  recommendedResources: [],
  latestReport: null,
  upcomingMeeting: null,
});
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const node = () => (
    <QueryClientProvider client={client}>
      <LiveStudentWorkspaceLoader />
    </QueryClientProvider>
  );
  return { ...render(node()), node };
}
function pending() {
  let resolve!: (v: any) => void;
  const promise = new Promise<any>((yes) => (resolve = yes));
  return { promise, resolve };
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  api.viewer = "caller";
  api.loading = false;
});
it("shares the confirmed profile between the real overview and widgets", async () => {
  api.context.mockResolvedValue(context());
  api.snapshot.mockResolvedValue(snapshot());
  setup();
  await screen.findByText("Widgets student selected");
  expect(screen.getByText("Sample Student")).toBeTruthy();
  expect(api.snapshot).toHaveBeenCalledWith({ data: { student_id: "selected" } });
});
for (const state of ["missing", "ambiguous"] as const)
  it(`does not read or render an unscoped snapshot for a ${state} connection`, async () => {
    api.context.mockResolvedValue({ ...context(), student_id: null, connection_status: state });
    setup();
    await screen.findByRole("status");
    expect(api.snapshot).not.toHaveBeenCalled();
    expect(screen.queryByText(/Widgets/)).toBeNull();
  });
it("keeps Owner management-only", async () => {
  api.context.mockResolvedValue({
    ...context(),
    student_id: null,
    management_only: true,
    connection_status: "management",
  });
  setup();
  expect((await screen.findByRole("link", { name: "Owner Hub" })).getAttribute("href")).toBe("/owner");
  expect(api.snapshot).not.toHaveBeenCalled();
  expect(screen.queryByText(/Widgets/)).toBeNull();
});
it("rejects a context response for another viewer", async () => {
  api.context.mockResolvedValue(context("selected", "other"));
  setup();
  await screen.findByRole("alert");
  expect(api.snapshot).not.toHaveBeenCalled();
});
it("rejects a mismatched snapshot instead of scoping widgets to it", async () => {
  api.context.mockResolvedValue(context());
  api.snapshot.mockResolvedValue(snapshot("other"));
  setup();
  await screen.findByRole("alert");
  expect(screen.queryByText(/Widgets/)).toBeNull();
});
it("offers retry after context failure", async () => {
  api.context
    .mockRejectedValueOnce(new Error("Private backend detail"))
    .mockResolvedValue(context());
  api.snapshot.mockResolvedValue(snapshot());
  setup();
  await screen.findByRole("alert");
  expect(screen.queryByText("Private backend detail")).toBeNull();
  fireEvent.click(screen.getByText("Try Again"));
  await screen.findByText("Widgets student selected");
});
it("offers retry after snapshot failure", async () => {
  api.context.mockResolvedValue(context());
  api.snapshot.mockRejectedValueOnce(new Error("failure")).mockResolvedValue(snapshot());
  setup();
  await screen.findByRole("alert");
  fireEvent.click(screen.getByText("Try Again"));
  await screen.findByText("Widgets student selected");
});
it("waits for sign-in", () => {
  api.loading = true;
  setup();
  expect(screen.getByRole("status")).toBeTruthy();
  expect(api.context).not.toHaveBeenCalled();
});
it("clears accepted rows and widgets after sign-out", async () => {
  api.context.mockResolvedValue(context());
  api.snapshot.mockResolvedValue(snapshot());
  const view = setup();
  await screen.findByText("Widgets student selected");
  api.viewer = "";
  view.rerender(view.node());
  expect(screen.queryByText(/Widgets/)).toBeNull();
  expect(screen.queryByText("Sample Student")).toBeNull();
});
it("does not start a departed viewer's snapshot read after late context completion", async () => {
  const old = pending();
  api.context.mockReturnValueOnce(old.promise).mockResolvedValueOnce(context("new", "new-viewer"));
  api.snapshot.mockResolvedValue(snapshot("new"));
  const view = setup();
  await act(async () => {});
  api.viewer = "new-viewer";
  view.rerender(view.node());
  await screen.findByText("Widgets student new");
  await act(async () => old.resolve(context("old")));
  expect(api.snapshot.mock.calls).toEqual([[{ data: { student_id: "new" } }]]);
  expect(screen.queryByText("Widgets student old")).toBeNull();
});
