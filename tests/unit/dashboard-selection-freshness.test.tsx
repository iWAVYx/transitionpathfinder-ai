// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const api = vi.hoisted(() => ({
  students: vi.fn(),
  profile: vi.fn(),
  roles: vi.fn(),
  studentContext: vi.fn(),
  snapshot: vi.fn(),
  ensure: vi.fn(),
  seed: vi.fn(),
  navigate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  viewer: "caller",
  loading: false,
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => options,
  useNavigate: () => api.navigate,
  Link: ({ to, children, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: api.viewer
      ? { id: api.viewer, email: api.viewer + "@example.test", user_metadata: {} }
      : null,
    loading: api.loading,
  }),
}));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error } }));
vi.mock("@/lib/students.functions", () => ({
  listStudents: api.students,
  ensureOwnStudentProfile: api.ensure,
}));
vi.mock("@/lib/dashboard/student-hub-context.functions", () => ({
  getStudentHubContext: api.studentContext,
}));
vi.mock("@/lib/profile.functions", () => ({ getProfile: api.profile, getMyRoles: api.roles }));
vi.mock("@/lib/golden-path.functions", () => ({
  getDashboardSnapshot: api.snapshot,
  seedDemoStudent: api.seed,
}));
vi.mock("@/components/dashboard/OwnerWorkspaceGate", () => ({
  OwnerWorkspaceGate: ({ children }: any) => <>{children}</>,
}));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => <>{children}</> }));
vi.mock("@/components/site/SiteShell", () => ({
  SiteShell: ({ children }: any) => <section>{children}</section>,
}));
vi.mock("@/components/hub/HubShell", () => ({
  HubShell: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/components/dashboard/CommandCenter", () => ({
  WorkspaceZone: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/lib/hubs/registry", () => ({ getHub: () => ({}) }));
vi.mock("@/components/dashboard/DashboardErrorFallback", () => ({
  dashboardErrorComponent: () => () => null,
}));
vi.mock("@/components/dashboard/LiveFamilyWorkspaceOverview", () => ({
  LiveFamilyWorkspaceOverview: ({ firstName, snapshot }: any) => (
    <article>
      {firstName}: Student {snapshot.student.id}
    </article>
  ),
}));
vi.mock("@/components/dashboard/DashboardWidgetBoard", () => ({
  DashboardWidgetBoard: ({ studentId }: any) => <aside>Widgets: {studentId}</aside>,
}));
vi.mock("@/components/dashboard/StudentDashboard", () => ({
  StudentDashboard: ({ firstName, snap, loading, error, onReconnect }: any) => (
    <div>
      {loading ? (
        <p role="status">Student Loading</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <article>
          {firstName}: Student {snap.student?.id ?? "Missing"}
        </article>
      )}
      <button onClick={onReconnect}>Reconnect Test Profile</button>
    </div>
  ),
}));
import { Route as MainRoute } from "@/routes/_authenticated/dashboard";
import { Route as FamilyRoute } from "@/routes/_authenticated/hubs.family";
const A = "10000000-0000-4000-8000-000000000001",
  B = "10000000-0000-4000-8000-000000000002",
  C = "10000000-0000-4000-8000-000000000003",
  D = "10000000-0000-4000-8000-000000000004";
const students = (ids = [A, B, C]) => ({
  students: ids.map((id) => ({
    id,
    first_name: id === A ? "Alex" : id === B ? "Blair" : "Casey",
    last_name: null,
  })),
  loadFailed: false,
});
const snapshot = (id: string) => ({
  student: { id },
  latestReport: null,
  goals: [],
  documents: [],
  actionItems: [],
  upcomingMeeting: null,
  meetingPrep: [],
  recommendedResources: [],
  consents: [],
});
function pending() {
  let resolve!: (v: any) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const clients: QueryClient[] = [];
function setup(family = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  const Page = (family ? FamilyRoute : (MainRoute as any)).component;
  const node = () => (
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>
  );
  return { ...render(node()), node, client };
}
function defaults() {
  api.students.mockImplementation(async () => students(api.viewer === "caller" ? [A, B, C] : [D]));
  api.profile.mockImplementation(async () => ({
    id: api.viewer,
    first_name: api.viewer === "caller" ? "First" : "Second",
    primary_role: "parent",
  }));
  api.roles.mockResolvedValue({ roles: ["parent"] });
  api.studentContext.mockResolvedValue({
    viewer_id: api.viewer,
    student_id: A,
    connection_status: "ready",
    management_only: false,
  });
  api.snapshot.mockImplementation(async ({ data }: any) => snapshot(data.student_id));
}
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((c) => c.clear());
  vi.resetAllMocks();
  api.viewer = "caller";
  api.loading = false;
  window.localStorage.clear();
});
it.each([false, true])(
  "waits for resolved sign-in before workspace reads (Family Hub %s)",
  async (family) => {
    defaults();
    api.loading = true;
    const v = setup(family);
    expect(api.students).not.toHaveBeenCalled();
    expect(api.profile).not.toHaveBeenCalled();
    expect(api.snapshot).not.toHaveBeenCalled();
    api.loading = false;
    v.rerender(v.node());
    await screen.findByText(`First: Student ${A}`);
    expect(api.students).toHaveBeenCalledWith({ data: { expected_viewer_id: "caller" } });
    expect(api.snapshot).toHaveBeenCalledWith({
      data: { student_id: A, expected_viewer_id: "caller" },
    });
  },
);
it.each([false, true])(
  "hides loaded content during sign-out and reloads a new viewer (Family Hub %s)",
  async (family) => {
    defaults();
    const v = setup(family);
    await screen.findByText(`First: Student ${A}`);
    api.loading = true;
    v.rerender(v.node());
    expect(screen.queryByText(`First: Student ${A}`)).toBeNull();
    expect(screen.queryByText(`Widgets: ${A}`)).toBeNull();
    api.loading = false;
    api.viewer = "other";
    v.rerender(v.node());
    expect(screen.queryByText(`First: Student ${A}`)).toBeNull();
    await screen.findByText(`Second: Student ${D}`);
    expect(api.snapshot).toHaveBeenCalledWith({
      data: { student_id: D, expected_viewer_id: "other" },
    });
    api.viewer = "";
    v.rerender(v.node());
    expect(screen.queryByRole("article")).toBeNull();
  },
);
it.each([false, true])("ignores a departed snapshot success (Family Hub %s)", async (family) => {
  defaults();
  const old = pending();
  api.snapshot.mockReturnValueOnce(old.promise).mockResolvedValue(snapshot(D));
  const v = setup(family);
  await waitFor(() => expect(api.snapshot).toHaveBeenCalledOnce());
  api.viewer = "other";
  v.rerender(v.node());
  await screen.findByText(`Second: Student ${D}`);
  await act(async () => old.resolve(snapshot(A)));
  expect(screen.queryByText(`First: Student ${A}`)).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
});
it.each([false, true])(
  "departed student-list responses cannot start snapshot or setup reads (Family Hub %s)",
  async (family) => {
    defaults();
    const old = pending();
    api.students.mockReturnValueOnce(old.promise).mockResolvedValue(students([D]));
    const v = setup(family);
    await waitFor(() => expect(api.students).toHaveBeenCalledOnce());
    api.viewer = "other";
    v.rerender(v.node());
    await screen.findByText(`Second: Student ${D}`);
    await act(async () => old.resolve(students([])));
    expect(api.ensure).not.toHaveBeenCalled();
    expect(api.snapshot).toHaveBeenCalledTimes(1);
  },
);
it("a departed Owner-role response cannot redirect the new viewer", async () => {
  defaults();
  const old = pending();
  api.roles.mockReturnValueOnce(old.promise).mockResolvedValue({ roles: ["parent"] });
  const v = setup();
  await waitFor(() => expect(api.roles).toHaveBeenCalledOnce());
  expect(api.students).not.toHaveBeenCalled();
  api.viewer = "other";
  v.rerender(v.node());
  await screen.findByText(`Second: Student ${D}`);
  await act(async () => old.resolve({ roles: ["admin"] }));
  expect(api.navigate).not.toHaveBeenCalled();
});
it("a late profile name cannot replace the current viewer", async () => {
  defaults();
  const old = pending();
  api.profile
    .mockReturnValueOnce(old.promise)
    .mockResolvedValue({ id: "other", first_name: "Second", primary_role: "parent" });
  const v = setup();
  await waitFor(() => expect(api.profile).toHaveBeenCalledOnce());
  api.viewer = "other";
  v.rerender(v.node());
  await screen.findByText(`Second: Student ${D}`);
  await act(async () =>
    old.resolve({ id: "caller", first_name: "Old Name", primary_role: "student" }),
  );
  expect(screen.queryByText(new RegExp("Old Name"))).toBeNull();
});
it("latest selected-student request wins over an older completion", async () => {
  defaults();
  const v = setup();
  await screen.findByText(`First: Student ${A}`);
  const older = pending();
  const newer = pending();
  api.snapshot.mockReset().mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
  const select = screen.getByRole("combobox");
  fireEvent.change(select, { target: { value: B } });
  await waitFor(() => expect(api.snapshot).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByRole("combobox"), { target: { value: C } });
  await waitFor(() => expect(api.snapshot).toHaveBeenCalledTimes(2));
  expect(screen.queryByText(`First: Student ${A}`)).toBeNull();
  await act(async () => newer.resolve(snapshot(C)));
  await screen.findByText(`First: Student ${C}`);
  await act(async () => older.resolve(snapshot(B)));
  expect(screen.queryByText(`First: Student ${B}`)).toBeNull();
  expect(screen.getByRole("combobox").getAttribute("value")).toBeNull();
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(C);
});
it("retains an unavailable explicit selection for retry until the user chooses another student", async () => {
  defaults();
  setup();
  await screen.findByText(`First: Student ${A}`);
  api.students.mockResolvedValue(students([A, C]));
  api.snapshot.mockClear();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: B } });
  await screen.findByText(
    "The selected student is unavailable. Choose an available student or try again.",
  );
  expect(api.snapshot).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Try again"));
  await screen.findByText(
    "The selected student is unavailable. Choose an available student or try again.",
  );
  expect(api.snapshot).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("combobox", { name: "Choose a Student" }), {
    target: { value: C },
  });
  await screen.findByText(`First: Student ${C}`);
  expect(api.snapshot).toHaveBeenCalledWith({
    data: { student_id: C, expected_viewer_id: "caller" },
  });
});
it.each([false, true])("rejects a mismatched student snapshot (Family Hub %s)", async (family) => {
  defaults();
  api.snapshot.mockResolvedValue(snapshot(D));
  setup(family);
  await screen.findByText(
    family
      ? "We could not load the Family Hub."
      : "The selected student could not be confirmed. Please try again.",
  );
  expect(screen.queryByRole("article")).toBeNull();
});
it("a Family Hub read failure retries without an empty-state claim", async () => {
  defaults();
  api.students
    .mockResolvedValueOnce({ students: [], loadFailed: true })
    .mockResolvedValue(students([A]));
  setup(true);
  await screen.findByRole("alert");
  expect(screen.queryByText("No connected student yet.")).toBeNull();
  expect(api.snapshot).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Try Again"));
  await screen.findByText(`First: Student ${A}`);
});
it.each([false, true])(
  "does not request a default snapshot when no students are available (Family Hub %s)",
  async (family) => {
    defaults();
    api.students.mockResolvedValue(students([]));
    setup(family);
    await screen.findByText(family ? "No connected student yet." : "Try with demo student");
    expect(api.snapshot).not.toHaveBeenCalled();
    expect(api.ensure).not.toHaveBeenCalled();
  },
);
it("does not run automatic Student setup after a failed link read", async () => {
  defaults();
  api.profile.mockResolvedValue({ id: "caller", first_name: "First", primary_role: "student" });
  api.roles.mockResolvedValue({ roles: ["student"] });
  api.studentContext.mockRejectedValue(new Error("Student connection could not be loaded."));
  setup();
  await screen.findByText("Student connection could not be loaded.");
  expect(api.ensure).not.toHaveBeenCalled();
  expect(api.snapshot).not.toHaveBeenCalled();
  expect(api.students).not.toHaveBeenCalled();
});
it("Student reconnect retains caller intent and checks the reloaded link", async () => {
  defaults();
  api.profile.mockResolvedValue({ id: "caller", first_name: "First", primary_role: "student" });
  api.roles.mockResolvedValue({ roles: ["student"] });
  api.studentContext
    .mockResolvedValueOnce({
      viewer_id: "caller",
      student_id: null,
      connection_status: "missing",
      management_only: false,
    })
    .mockRejectedValueOnce(new Error("Student connection could not be loaded."));
  api.ensure.mockResolvedValue({ id: A });
  setup();
  await screen.findByText("Student connection could not be loaded.");
  expect(api.ensure).toHaveBeenCalledWith({ data: { expected_viewer_id: "caller" } });
  expect(api.snapshot).not.toHaveBeenCalled();
  expect(api.students).not.toHaveBeenCalled();
});
function studentAccount(roles = ["student"]) {
  defaults();
  api.roles.mockResolvedValue({ roles });
  api.profile.mockResolvedValue({ id: "caller", first_name: "First", primary_role: "student" });
}
it.each([
  { roles: ["student"] },
  { roles: ["student", "educator"] },
  { roles: ["student", "partner"] },
])(
  "resolves linked Student context instead of an accessible-list default for $roles",
  async ({ roles }) => {
    studentAccount(roles);
    api.students.mockResolvedValue(students([D]));
    setup();
    await screen.findByText(`First: Student ${A}`);
    expect(api.students).not.toHaveBeenCalled();
    expect(api.studentContext).toHaveBeenCalledWith({ data: { expected_viewer_id: "caller" } });
    expect(api.snapshot).toHaveBeenCalledWith({
      data: { student_id: A, expected_viewer_id: "caller" },
    });
  },
);
it.each(["ambiguous", "management"])(
  "does not repair or substitute a %s Student connection",
  async (status) => {
    studentAccount();
    api.studentContext.mockResolvedValue({
      viewer_id: "caller",
      student_id: null,
      connection_status: status,
      management_only: status === "management",
    });
    setup();
    if (status === "management") {
      await waitFor(() => expect(api.navigate).toHaveBeenCalledWith({ to: "/owner", replace: true }));
      expect(screen.queryByText("Reconnect Test Profile")).toBeNull();
      expect(screen.queryByRole("article")).toBeNull();
    } else await screen.findByRole("alert");
    expect(api.ensure).not.toHaveBeenCalled();
    expect(api.snapshot).not.toHaveBeenCalled();
    expect(api.students).not.toHaveBeenCalled();
  },
);
it("rejects a Student link response for another viewer", async () => {
  studentAccount();
  api.studentContext.mockResolvedValue({
    viewer_id: "other",
    student_id: D,
    connection_status: "ready",
    management_only: false,
  });
  setup();
  await screen.findByText("Your sign-in changed. Please try again.");
  expect(api.snapshot).not.toHaveBeenCalled();
  expect(api.ensure).not.toHaveBeenCalled();
});
it("repairs only a confirmed missing link and re-resolves rather than trusting the repair return", async () => {
  studentAccount();
  api.studentContext
    .mockResolvedValueOnce({
      viewer_id: "caller",
      student_id: null,
      connection_status: "missing",
      management_only: false,
    })
    .mockResolvedValueOnce({
      viewer_id: "caller",
      student_id: B,
      connection_status: "ready",
      management_only: false,
    });
  api.ensure.mockResolvedValue({ id: D });
  setup();
  await screen.findByText(`First: Student ${B}`);
  expect(api.snapshot).toHaveBeenCalledWith({
    data: { student_id: B, expected_viewer_id: "caller" },
  });
  expect(api.snapshot).not.toHaveBeenCalledWith({
    data: { student_id: D, expected_viewer_id: "caller" },
  });
  expect(api.ensure).toHaveBeenCalledOnce();
});
it("does not silently switch a previously accepted Student link", async () => {
  studentAccount();
  setup();
  await screen.findByText(`First: Student ${A}`);
  api.studentContext.mockResolvedValue({
    viewer_id: "caller",
    student_id: B,
    connection_status: "ready",
    management_only: false,
  });
  api.snapshot.mockClear();
  fireEvent.click(screen.getByText("Reconnect Test Profile"));
  await screen.findByText(
    "Your previous student connection is unavailable. Ask your team to confirm it, then try again.",
  );
  expect(api.snapshot).not.toHaveBeenCalled();
  expect(api.ensure).not.toHaveBeenCalled();
});
it("a still-missing link after repair stays empty without a default snapshot", async () => {
  studentAccount();
  api.studentContext.mockResolvedValue({
    viewer_id: "caller",
    student_id: null,
    connection_status: "missing",
    management_only: false,
  });
  api.ensure.mockResolvedValue({ id: D });
  setup();
  await screen.findByText("First: Student Missing");
  expect(api.snapshot).not.toHaveBeenCalled();
  expect(api.ensure).toHaveBeenCalledOnce();
});
it("a Family decision remains Family when a late profile says Student", async () => {
  defaults();
  const old = pending();
  api.profile.mockReturnValueOnce(old.promise);
  setup();
  await screen.findByText(`caller: Student ${A}`);
  await act(async () =>
    old.resolve({ id: "caller", first_name: "First", primary_role: "student" }),
  );
  await screen.findByText(`First: Student ${A}`);
  expect(api.studentContext).not.toHaveBeenCalled();
  expect(screen.queryByText("Reconnect Test Profile")).toBeNull();
});
it("a Family plus Student account keeps Family selection while Student-only uses its own link", async () => {
  studentAccount(["student", "parent"]);
  setup();
  await screen.findByText(`First: Student ${A}`);
  expect(screen.getByRole("combobox")).toBeTruthy();
  expect(api.studentContext).not.toHaveBeenCalled();
  expect(api.students).toHaveBeenCalled();
});
it("a Student loading hint cannot bypass role confirmation or choose a Family account's student", async () => {
  defaults();
  window.localStorage.setItem("tf:e2e-dashboard-testid", "student-dashboard-main");
  const old = pending();
  api.roles.mockReturnValueOnce(old.promise);
  setup();
  await screen.findByText("Checking Your Workspace Access");
  expect(api.students).not.toHaveBeenCalled();
  expect(api.studentContext).not.toHaveBeenCalled();
  expect(api.snapshot).not.toHaveBeenCalled();
  await act(async () => old.resolve({ roles: ["parent"] }));
  await screen.findByText(`First: Student ${A}`);
  expect(api.studentContext).not.toHaveBeenCalled();
});
it.each(["reject", "unknown", "empty"])(
  "failed or unsupported role result %s never loads Family by default and can retry",
  async (kind) => {
    defaults();
    if (kind === "reject") api.roles.mockRejectedValueOnce(new Error("Private detail"));
    else api.roles.mockResolvedValueOnce({ roles: kind === "empty" ? [] : ["other"] });
    setup();
    await screen.findByRole("alert");
    expect(api.students).not.toHaveBeenCalled();
    expect(api.snapshot).not.toHaveBeenCalled();
    expect(api.studentContext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Try Again"));
    await screen.findByText(`First: Student ${A}`);
  },
);
it.each([
  ["admin", "/owner"],
  ["educator", "/caseload"],
  ["case_manager", "/caseload"],
  ["school_admin", "/school/overview"],
  ["district_admin", "/district/overview"],
  ["partner", "/partners-manage"],
])("%s redirects to %s without loading personal plans", async (role, to) => {
  defaults();
  api.roles.mockResolvedValue({ roles: [role] });
  setup();
  await waitFor(() => expect(api.navigate).toHaveBeenCalledWith({ to, replace: true }));
  expect(api.students).not.toHaveBeenCalled();
  expect(api.snapshot).not.toHaveBeenCalled();
  expect(api.studentContext).not.toHaveBeenCalled();
});

it.each([false, true])(
  "departed Student context cannot load a snapshot or error in another viewer (failure %s)",
  async (failure) => {
    defaults();
    api.roles
      .mockResolvedValueOnce({ roles: ["student"] })
      .mockResolvedValue({ roles: ["parent"] });
    const old = pending();
    api.studentContext.mockReturnValueOnce(old.promise);
    const v = setup();
    await waitFor(() => expect(api.studentContext).toHaveBeenCalledOnce());
    api.viewer = "other";
    v.rerender(v.node());
    await screen.findByText(`Second: Student ${D}`);
    await act(async () =>
      failure
        ? old.reject(new Error("Old link failure"))
        : old.resolve({
            viewer_id: "caller",
            student_id: A,
            connection_status: "ready",
            management_only: false,
          }),
    );
    expect(api.snapshot).toHaveBeenCalledTimes(1);
    expect(api.snapshot).toHaveBeenCalledWith({
      data: { student_id: D, expected_viewer_id: "other" },
    });
    expect(api.ensure).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  },
);
