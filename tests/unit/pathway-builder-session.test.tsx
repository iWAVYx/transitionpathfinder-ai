// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  viewer: "viewer-a" as string | null,
  loading: false,
  roles: vi.fn(),
  owner: vi.fn(),
  students: vi.fn(),
  snapshot: vi.fn(),
  generate: vi.fn(),
  navigate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  about: null as any,
  form: null as any,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => api.navigate,
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: api.viewer ? { id: api.viewer } : null, loading: api.loading }),
}));
vi.mock("@/components/pathway/IepUpload", () => ({ IepUpload: () => null }));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => children }));
vi.mock("@/components/RoutePageOutlet", () => ({
  RoutePageOutlet: ({ children }: any) => children,
}));
vi.mock("@/components/site/SiteShell", () => ({
  SiteShell: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/lib/profile.functions", () => ({ getMyRoles: api.roles }));
vi.mock("@/lib/owner/owner.functions", () => ({ getMyAdminRoles: api.owner }));
vi.mock("@/lib/students.functions", () => ({ listStudents: api.students }));
vi.mock("@/lib/golden-path.functions", () => ({ getDashboardSnapshot: api.snapshot }));
vi.mock("@/lib/pathway.functions", () => ({ createPathwayReport: api.generate }));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error, info: api.info } }));
// Keep the actual form, role picker, steps/navigation and Owner gate. Replace only
// About's visual fields to drive selection/tampering without Radix portal mechanics.
vi.mock("@/components/pathway/PathwayBuilderSteps", async (original) => {
  const steps = await original<typeof import("@/components/pathway/PathwayBuilderSteps")>();
  const { useFormContext } = await import("react-hook-form");
  return {
    ...steps,
    StepAbout: (props: any) => {
      const form = useFormContext();
      api.about = props;
      api.form = form;
      return (
        <div>
          <input aria-label="Student Name" {...form.register("student_first_name")} />
          <output data-testid="selected-student">{props.connectedStudentId ?? "manual"}</output>
          <output data-testid="prefill-state">
            {props.prefillLoading ? "loading" : "settled"}
          </output>
          {props.connectedStudents.map((student: any) => (
            <button
              type="button"
              key={student.id}
              onClick={() => props.onStudentChange(student.id)}
            >
              Connect {student.first_name}
            </button>
          ))}
        </div>
      );
    },
  };
});
import { Route } from "@/routes/_authenticated/pathway";
const Page = (Route as any).component;
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const reportId = "33333333-3333-4333-8333-333333333333";
const students = [
  { id: a, first_name: "Alpha" },
  { id: b, first_name: "Beta" },
];
const snapshot = (id: string, name = "Current Sample") => ({ student: { id, first_name: name } });
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function about() {
  fireEvent.click(await screen.findByTestId("pathway-continue"));
  await screen.findByLabelText("Student Name");
}
async function manual() {
  await about();
  fireEvent.change(screen.getByLabelText("Student Name"), { target: { value: "Manual Sample" } });
}
function submit() {
  fireEvent.submit(screen.getByTestId("pathway-intake-form"));
}
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.viewer = "viewer-a";
  api.loading = false;
  api.about = null;
  api.form = null;
  api.owner.mockResolvedValue({ isPlatformAdmin: false });
  api.roles.mockResolvedValue({ roles: ["parent"] });
  api.students.mockResolvedValue({ students: [], loadFailed: false });
  api.snapshot.mockImplementation(({ data }: any) => Promise.resolve(snapshot(data.student_id)));
  api.generate.mockResolvedValue({ reportId, studentId: null });
  api.navigate.mockResolvedValue(undefined);
});
describe("Pathway Builder verified planning session", () => {
  it("waits for auth and roles before requesting students", async () => {
    api.loading = true;
    const view = render(<Page />);
    expect(api.owner).not.toHaveBeenCalled();
    expect(api.roles).not.toHaveBeenCalled();
    expect(api.students).not.toHaveBeenCalled();
    api.loading = false;
    const roles = deferred();
    api.roles.mockReturnValue(roles.promise);
    view.rerender(<Page />);
    await waitFor(() => expect(api.roles).toHaveBeenCalled());
    expect(api.students).not.toHaveBeenCalled();
    expect(screen.queryByTestId("pathway-intake-form")).toBeNull();
    await act(async () => roles.resolve({ roles: ["teacher"] }));
    await screen.findByTestId("pathway-role-educator");
    expect(screen.queryByTestId("pathway-role-family")).toBeNull();
    expect(api.roles).toHaveBeenCalledWith({ data: { expected_viewer_id: "viewer-a" } });
    expect(api.students).toHaveBeenCalledWith({ data: { expected_viewer_id: "viewer-a" } });
  });
  it.each(["student", "partner", "school_admin", "district_admin", "unknown", "admin"])(
    "does not load students or mount a builder for %s",
    async (role) => {
      api.roles.mockResolvedValue({ roles: [role] });
      render(<Page />);
      await screen.findByText(/Pathway Builder is available for family and educator/);
      expect(api.students).not.toHaveBeenCalled();
      expect(api.generate).not.toHaveBeenCalled();
      expect(screen.queryByTestId("pathway-intake-form")).toBeNull();
    },
  );
  it("sends a platform Owner with ordinary Family metadata to Owner Hub before planning reads", async () => {
    api.owner.mockResolvedValue({ isPlatformAdmin: true });
    render(<Page />);
    await waitFor(() => expect(api.navigate).toHaveBeenCalledWith({ to: "/owner", replace: true }));
    expect(api.roles).not.toHaveBeenCalled();
    expect(api.students).not.toHaveBeenCalled();
  });
  it.each([{ roles: ["parent"] }, { roles: ["teacher"] }, { roles: ["parent", "teacher"] }])(
    "shows only verified perspectives %j",
    async ({ roles }) => {
      api.roles.mockResolvedValue({ roles });
      render(<Page />);
      await screen.findByTestId("pathway-continue");
      expect(Boolean(screen.queryByTestId("pathway-role-family"))).toBe(roles.includes("parent"));
      expect(Boolean(screen.queryByTestId("pathway-role-educator"))).toBe(
        roles.includes("teacher"),
      );
      expect(screen.queryByTestId("pathway-role-student")).toBeNull();
    },
  );
  it.each([
    { students: [], loadFailed: true },
    { students: [] },
    { students: null, loadFailed: false },
    { students: [{ id: "bad" }], loadFailed: false },
    { students: [students[0], students[0]], loadFailed: false },
  ])("never treats unavailable/malformed students as a manual-entry success %#", async (result) => {
    api.students.mockResolvedValueOnce(result);
    render(<Page />);
    fireEvent.click(await screen.findByRole("button", { name: "Reload Planning View" }));
    await screen.findByTestId("pathway-intake-form");
    expect(api.roles).toHaveBeenCalledTimes(2);
    expect(api.students).toHaveBeenCalledTimes(2);
  });
  it.each([null, {}, { roles: null }, { roles: ["parent", 1] }])(
    "retries invalid role metadata without student reads %#",
    async (value) => {
      api.roles.mockResolvedValueOnce(value);
      render(<Page />);
      const retry = await screen.findByRole("button", { name: "Reload Planning View" });
      expect(api.students).not.toHaveBeenCalled();
      fireEvent.click(retry);
      await screen.findByTestId("pathway-intake-form");
    },
  );
  it.each(["parent", "teacher"])(
    "manual entry remains available for %s after a confirmed empty student list",
    async (role) => {
      api.roles.mockResolvedValue({ roles: [role] });
      render(<Page />);
      await manual();
      submit();
      await waitFor(() => expect(api.generate).toHaveBeenCalledOnce());
      expect(api.generate.mock.calls[0][0].data).toMatchObject({
        expected_viewer_id: "viewer-a",
        submitter_role: role === "parent" ? "family" : "educator",
        student_first_name: "Manual Sample",
      });
      await waitFor(() =>
        expect(api.navigate).toHaveBeenCalledWith(
          expect.objectContaining({ to: "/reports/$reportId", params: { reportId } }),
        ),
      );
    },
  );
  it("does not submit an unlisted student id even when injected into form state", async () => {
    render(<Page />);
    await manual();
    act(() => api.form.setValue("student_id", a));
    submit();
    await waitFor(() => expect(api.error).toHaveBeenCalled());
    expect(api.generate).not.toHaveBeenCalled();
  });
  it("auto-connects the only authorized profile and verifies its identity", async () => {
    api.students.mockResolvedValue({ students: [students[0]], loadFailed: false });
    render(<Page />);
    await about();
    await waitFor(() =>
      expect((screen.getByLabelText("Student Name") as HTMLInputElement).value).toBe(
        "Current Sample",
      ),
    );
    expect(api.snapshot).toHaveBeenCalledWith({
      data: { student_id: a, expected_viewer_id: "viewer-a" },
    });
    api.generate.mockResolvedValue({ reportId, studentId: a });
    submit();
    await waitFor(() => expect(api.generate).toHaveBeenCalledOnce());
    expect(api.generate.mock.calls[0][0].data.student_id).toBe(a);
  });
  it("retains a mismatched profile selection for retry without accepting another student's values", async () => {
    api.students.mockResolvedValue({ students, loadFailed: false });
    api.snapshot.mockResolvedValueOnce(snapshot(b, "Wrong Student"));
    render(<Page />);
    await about();
    fireEvent.click(screen.getByRole("button", { name: "Connect Alpha" }));
    const retry = await screen.findByRole("button", { name: "Reload Student Profile" });
    expect(screen.getByTestId("selected-student").textContent).toBe(a);
    expect((screen.getByLabelText("Student Name") as HTMLInputElement).value).toBe("");
    act(() => api.form.setValue("student_first_name", "Edited While Failed"));
    submit();
    await act(async () => {});
    expect(api.generate).not.toHaveBeenCalled();
    fireEvent.click(retry);
    await waitFor(() =>
      expect((screen.getByLabelText("Student Name") as HTMLInputElement).value).toBe(
        "Current Sample",
      ),
    );
  });
  it("only accepts the latest selection and discards extraction callbacks from an earlier student", async () => {
    api.students.mockResolvedValue({ students, loadFailed: false });
    const old = deferred();
    api.snapshot.mockReturnValueOnce(old.promise);
    render(<Page />);
    await about();
    const oldExtract = api.about.onExtracted;
    act(() => api.about.onStudentChange(a));
    act(() => api.about.onStudentChange(b));
    await waitFor(() =>
      expect((screen.getByLabelText("Student Name") as HTMLInputElement).value).toBe(
        "Current Sample",
      ),
    );
    await act(async () => old.resolve(snapshot(a, "Old Profile")));
    act(() => oldExtract({ student_first_name: "Old Extract" }));
    expect(screen.getByTestId("selected-student").textContent).toBe(b);
    expect((screen.getByLabelText("Student Name") as HTMLInputElement).value).toBe(
      "Current Sample",
    );
  });
  it("blocks duplicate generation and freezes editing/step navigation while pending", async () => {
    const pending = deferred();
    api.generate.mockReturnValue(pending.promise);
    render(<Page />);
    await manual();
    submit();
    submit();
    await waitFor(() => expect(api.generate).toHaveBeenCalledOnce());
    expect(screen.getByTestId("pathway-intake-form").querySelector("fieldset")?.disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Your role" }));
    expect(screen.getByTestId("pathway-intake-form").getAttribute("data-pathway-step")).toBe(
      "about",
    );
    await act(async () => pending.resolve({ reportId, studentId: null }));
  });
  it.each(["account", "loading", "signout", "unmount"])(
    "ignores generation completion after %s",
    async (change) => {
      const pending = deferred();
      api.generate.mockReturnValue(pending.promise);
      const view = render(<Page />);
      await manual();
      submit();
      await waitFor(() => expect(api.generate).toHaveBeenCalledOnce());
      if (change === "account") api.viewer = "viewer-b";
      if (change === "loading") api.loading = true;
      if (change === "signout") api.viewer = null;
      if (change === "unmount") view.unmount();
      else view.rerender(<Page />);
      await act(async () => pending.resolve({ reportId, studentId: null }));
      expect(api.navigate).not.toHaveBeenCalled();
      expect(api.success).not.toHaveBeenCalled();
      expect(api.error).not.toHaveBeenCalled();
    },
  );
  it.each([{}, { reportId: "bad", studentId: null }, { reportId, studentId: b }])(
    "does not navigate to an unconfirmed generated result %#",
    async (result) => {
      api.generate.mockResolvedValue(result);
      render(<Page />);
      await manual();
      submit();
      await screen.findByRole("link", { name: "Check saved reports in a new tab" });
      expect(api.navigate).not.toHaveBeenCalled();
    },
  );
  it("retains answers and offers saved-report guidance when navigation fails", async () => {
    api.navigate.mockRejectedValueOnce(new Error("Private navigation detail"));
    render(<Page />);
    await manual();
    submit();
    await screen.findByRole("link", { name: "Check saved reports in a new tab" });
    expect((screen.getByLabelText("Student Name") as HTMLInputElement).value).toBe("Manual Sample");
    expect(document.body.textContent).not.toContain("Private navigation detail");
  });
});

describe("departed planning reads and errors", () => {
  it.each(["roles", "students"])(
    "retries a rejected %s read without exposing a manual form",
    async (stage) => {
      api[stage].mockRejectedValueOnce(new Error("Private read detail"));
      render(<Page />);
      const retry = await screen.findByRole("button", { name: "Reload Planning View" });
      expect(screen.queryByTestId("pathway-intake-form")).toBeNull();
      expect(document.body.textContent).not.toContain("Private read detail");
      fireEvent.click(retry);
      await screen.findByTestId("pathway-intake-form");
    },
  );
  it.each([false, true])("ignores departed role results (failure %s)", async (failure) => {
    const old = deferred();
    api.roles.mockReturnValueOnce(old.promise);
    const view = render(<Page />);
    await waitFor(() => expect(api.roles).toHaveBeenCalledOnce());
    api.viewer = "viewer-b";
    api.roles.mockResolvedValue({ roles: ["teacher"] });
    view.rerender(<Page />);
    await screen.findByTestId("pathway-role-educator");
    await act(async () =>
      failure ? old.reject(new Error("Old role detail")) : old.resolve({ roles: ["parent"] }),
    );
    expect(screen.queryByTestId("pathway-role-family")).toBeNull();
    expect(api.students).toHaveBeenCalledTimes(1);
    expect(api.students).toHaveBeenLastCalledWith({ data: { expected_viewer_id: "viewer-b" } });
  });
  it.each([false, true])(
    "ignores departed student collection results (failure %s)",
    async (failure) => {
      const old = deferred();
      api.students.mockReturnValueOnce(old.promise);
      const view = render(<Page />);
      await waitFor(() => expect(api.students).toHaveBeenCalledOnce());
      api.viewer = "viewer-b";
      view.rerender(<Page />);
      await manual();
      await act(async () =>
        failure
          ? old.reject(new Error("Old list detail"))
          : old.resolve({ students: [students[0]], loadFailed: false }),
      );
      expect(screen.queryByRole("button", { name: "Connect Alpha" })).toBeNull();
      expect(api.snapshot).not.toHaveBeenCalled();
    },
  );
  it.each([false, true])(
    "ignores departed prefill completion and notices (failure %s)",
    async (failure) => {
      const old = deferred();
      api.snapshot.mockReturnValueOnce(old.promise);
      api.students.mockResolvedValueOnce({ students, loadFailed: false });
      const view = render(<Page />);
      await about();
      fireEvent.click(screen.getByRole("button", { name: "Connect Alpha" }));
      api.viewer = "viewer-b";
      view.rerender(<Page />);
      await manual();
      await act(async () =>
        failure
          ? old.reject(new Error("Old profile detail"))
          : old.resolve(snapshot(a, "Old Profile")),
      );
      expect((screen.getByLabelText("Student Name") as HTMLInputElement).value).toBe(
        "Manual Sample",
      );
      expect(api.success).not.toHaveBeenCalled();
      expect(api.error).not.toHaveBeenCalled();
    },
  );
  it("keeps a rejected prefill behind retry rather than generating a manual fallback", async () => {
    api.students.mockResolvedValue({ students, loadFailed: false });
    api.snapshot.mockRejectedValueOnce(new Error("Private profile detail"));
    render(<Page />);
    await about();
    fireEvent.click(screen.getByRole("button", { name: "Connect Alpha" }));
    const retry = await screen.findByRole("button", { name: "Reload Student Profile" });
    expect(api.form.getValues("student_id")).toBe(a);
    expect(document.body.textContent).not.toContain("Private profile detail");
    act(() => api.form.setValue("student_first_name", "Manual After Error"));
    submit();
    await act(async () => {});
    expect(api.generate).not.toHaveBeenCalled();
    fireEvent.click(retry);
    await waitFor(() => expect(api.form.getValues("student_first_name")).toBe("Current Sample"));
  });
  it("rejects an unsupported perspective injected into a Family form", async () => {
    render(<Page />);
    await manual();
    act(() => api.form.setValue("submitter_role", "educator"));
    submit();
    await waitFor(() =>
      expect(api.error).toHaveBeenCalledWith("Choose a role available to your signed-in account."),
    );
    expect(api.generate).not.toHaveBeenCalled();
  });
  it("does not accept a generation result after its form context was changed directly", async () => {
    const request = deferred();
    api.generate.mockReturnValueOnce(request.promise);
    render(<Page />);
    await manual();
    submit();
    await waitFor(() => expect(api.generate).toHaveBeenCalledOnce());
    act(() => api.form.setValue("student_id", a));
    await act(async () => request.resolve({ reportId, studentId: null }));
    expect(api.navigate).not.toHaveBeenCalled();
  });
  it("discards generation errors after an account change", async () => {
    const request = deferred();
    api.generate.mockReturnValueOnce(request.promise);
    const view = render(<Page />);
    await manual();
    submit();
    await waitFor(() => expect(api.generate).toHaveBeenCalledOnce());
    api.viewer = "viewer-b";
    view.rerender(<Page />);
    await act(async () => request.reject(new Error("Departed generation detail")));
    expect(api.error).not.toHaveBeenCalled();
    expect(api.navigate).not.toHaveBeenCalled();
  });
});
