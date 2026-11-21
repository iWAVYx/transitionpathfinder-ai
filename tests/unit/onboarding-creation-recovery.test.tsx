// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { it, expect, vi, beforeEach, afterEach } from "vitest";
const api = vi.hoisted(() => ({
  viewer: "00000000-0000-4000-8000-000000000001",
  profile: vi.fn(),
  license: vi.fn(),
  progress: vi.fn(),
  complete: vi.fn(),
  create: vi.fn(),
  self: vi.fn(),
  recover: vi.fn(),
  navigate: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: api.viewer }, loading: false }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => options,
  Link: ({ children }: any) => <a>{children}</a>,
  useNavigate: () => api.navigate,
}));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/forms/SchoolPicker", () => ({ SchoolPicker: () => null }));
vi.mock("@/lib/profile.functions", () => ({
  getProfile: api.profile,
  saveOnboardingProgress: api.progress,
  completeOnboarding: api.complete,
}));
vi.mock("@/lib/students.functions", () => ({
  createStudent: api.create,
  ensureOwnStudentProfile: api.self,
  readStudentCreationOutcome: api.recover,
}));
vi.mock("@/lib/access-codes.functions", () => ({ getMyActivatedLicenseRole: api.license }));
vi.mock("@/lib/onboarding-questions", () => ({
  questionsForRole: () => null,
  tipsForRole: () => null,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: api.error } }));
import { Route } from "../../src/routes/_authenticated/onboarding";
const Page = (Route as any).component;
const request = "00000000-0000-4000-8000-000000000002";
const key = () => `tf:student-creation:v1:${api.viewer}`;
function seed(role = "parent") {
  localStorage.setItem(
    key(),
    JSON.stringify({
      version: 1,
      requestId: request,
      origin: "onboarding",
      kind: role === "student" ? "self" : "linked",
      role,
    }),
  );
  api.profile.mockResolvedValue({
    primary_role: role,
    first_name: "Fictional",
    onboarding_answers: {},
    onboarding_completed: false,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: { request: vi.fn(async (_k, _o, run) => run({})) },
  });
  api.license.mockResolvedValue(null);
  api.progress.mockResolvedValue({ ok: true });
  api.complete.mockResolvedValue({ ok: true });
  api.recover.mockResolvedValue({ status: "present", student_id: request });
  seed();
});
afterEach(cleanup);
for (const role of ["parent", "educator", "student"])
  it("resumes " + role + " from saved identity without creation", async () => {
    seed(role);
    render(<Page />);
    fireEvent.click(await screen.findByText("Check Saved Setup"));
    fireEvent.click(await screen.findByText("Continue With Saved Profile"));
    await waitFor(() => expect(api.complete).toHaveBeenCalledOnce());
    expect(api.create).not.toHaveBeenCalled();
    expect(api.self).not.toHaveBeenCalled();
    await waitFor(() => expect(localStorage.getItem(key())).toBeNull());
    expect(api.progress.mock.calls[0][0].data.expected_viewer_id).toBe(api.viewer);
    expect(api.complete.mock.calls[0][0].data.expected_viewer_id).toBe(api.viewer);
  });
it("completion failure survives refresh and never creates a second student", async () => {
  api.complete.mockRejectedValueOnce(Error("Lost completion"));
  render(<Page />);
  fireEvent.click(await screen.findByText("Check Saved Setup"));
  fireEvent.click(await screen.findByText("Continue With Saved Profile"));
  await waitFor(() => expect(api.error).toHaveBeenCalled());
  expect(localStorage.getItem(key())).not.toBeNull();
  cleanup();
  api.complete.mockResolvedValue({ ok: true });
  render(<Page />);
  fireEvent.click(await screen.findByText("Check Saved Setup"));
  fireEvent.click(await screen.findByText("Continue With Saved Profile"));
  await waitFor(() => expect(api.navigate).toHaveBeenCalled());
  expect(api.create).not.toHaveBeenCalled();
  expect(api.self).not.toHaveBeenCalled();
  expect(localStorage.getItem(key())).toBeNull();
});
it("completed profile with unresolved creation marker does not skip reconciliation", async () => {
  api.profile.mockResolvedValue({
    primary_role: "parent",
    first_name: "Fictional",
    onboarding_completed: true,
  });
  render(<Page />);
  await screen.findByText("Check Saved Setup");
  expect(api.navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Check Saved Setup"));
  fireEvent.click(await screen.findByText("Continue With Saved Profile"));
  await waitFor(() => expect(api.complete).toHaveBeenCalledOnce());
});
for (const status of ["removed", "unconfirmed"])
  it("does not complete or recreate " + status + " setup", async () => {
    api.recover.mockResolvedValue({ status });
    render(<Page />);
    fireEvent.click(await screen.findByText("Check Saved Setup"));
    await waitFor(() => expect(api.recover).toHaveBeenCalled());
    expect(screen.queryByText("Continue With Saved Profile")).toBeNull();
    expect(api.complete).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.self).not.toHaveBeenCalled();
  });
it("role change cannot reuse another role setup", async () => {
  api.profile.mockResolvedValue({ primary_role: "educator", first_name: "Fictional" });
  render(<Page />);
  fireEvent.click(await screen.findByText("Check Saved Setup"));
  fireEvent.click(await screen.findByText("Continue With Saved Profile"));
  await waitFor(() => expect(api.error).toHaveBeenCalled());
  expect(api.progress).not.toHaveBeenCalled();
  expect(api.complete).not.toHaveBeenCalled();
});

it("initial creation records intent before request and resumes after completion failure", async () => {
  localStorage.clear();
  api.create.mockImplementation(async ({ data }) => {
    expect(JSON.parse(localStorage.getItem(key())!).requestId).toBe(data.request_id);
    return { id: data.request_id };
  });
  api.complete.mockRejectedValueOnce(Error("Completion unavailable"));
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
  await waitFor(() => expect(screen.getByText("Step 2 of 3")).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(await screen.findByLabelText("Student first name *"), {
    target: { value: "Fictional Student" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Finish & open dashboard" }));
  await waitFor(() => expect(api.error).toHaveBeenCalled());
  expect(api.create).toHaveBeenCalledOnce();
  expect(localStorage.getItem(key())).not.toContain("Fictional Student");
  cleanup();
  api.complete.mockResolvedValue({ ok: true });
  render(<Page />);
  fireEvent.click(await screen.findByText("Check Saved Setup"));
  fireEvent.click(await screen.findByText("Continue With Saved Profile"));
  await waitFor(() => expect(api.navigate).toHaveBeenCalled());
  expect(api.create).toHaveBeenCalledOnce();
});
