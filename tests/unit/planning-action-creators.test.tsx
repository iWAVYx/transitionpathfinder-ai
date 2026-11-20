// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  user: { id: "viewer-a" } as { id: string } | null,
  loading: false,
  create: vi.fn(),
  matches: vi.fn(),
  students: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  event: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: api.user, loading: api.loading }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error } }));
vi.mock("@/lib/action-items.functions", () => ({ createStudentActionItem: api.create }));
vi.mock("@/lib/students.functions", () => ({ listStudents: api.students }));
vi.mock("@/lib/partner-matching.functions", () => ({ matchPartnersForStudent: api.matches }));
vi.mock("@/lib/calendar.functions", () => ({ createCalendarEvent: api.event }));
import { AddToPathwayButton } from "../../src/components/resources/AddToPathwayButton";
import { PartnerSuggestedActions } from "../../src/components/students/PartnerSuggestedActions";
import { ConnectToPlan } from "../../src/components/pathway/ConnectToPlan";
const student = { id: "student-a", first_name: "Fictional Student", last_name: null };
const report = (text = "Practice a next step") =>
  ({ thirty_day_plan: [{ week: 1, action: text }] }) as any;
function deferred() {
  let resolve!: (v: any) => void;
  const promise = new Promise<any>((yes) => (resolve = yes));
  return { promise, resolve };
}
const receipt = ({ data }: any) => ({
  item: {
    ...data,
    id: data.request_id,
    created_by_user_id: data.expected_viewer_id,
    status: "not_started",
  },
});
beforeEach(() => {
  vi.clearAllMocks();
  api.user = { id: "viewer-a" };
  api.loading = false;
  api.create.mockImplementation(async (args) => receipt(args));
  api.students.mockResolvedValue({ students: [student], loadFailed: false });
  api.matches.mockResolvedValue({
    matches: [
      {
        partner_id: "partner-a",
        organization_name: "Fictional Partner",
        suggested_next_step: "Ask about a visit",
        reasons: [],
        website_url: null,
      },
    ],
  });
});
afterEach(cleanup);
it("resources distinguish a failed student load from no students and permit read-only refresh", async () => {
  api.students.mockResolvedValueOnce({ students: [], loadFailed: true });
  render(<AddToPathwayButton title="Useful resource" />);
  fireEvent.click(screen.getByRole("button", { name: "Add to pathway" }));
  await screen.findByRole("button", { name: "Refresh Students" });
  expect(screen.queryByText(/Create a student first/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Refresh Students" }));
  await screen.findByRole("button", { name: "Fictional Student" });
});
it("resource saves use confirmed student/account receipts and human-readable feedback", async () => {
  render(<AddToPathwayButton title="Useful resource" />);
  fireEvent.click(screen.getByRole("button", { name: "Add to pathway" }));
  fireEvent.click(await screen.findByRole("button", { name: "Fictional Student" }));
  await act(async () => {});
  expect(api.create).toHaveBeenCalledOnce();
  expect(api.create.mock.calls[0][0].data).toMatchObject({
    student_id: "student-a",
    expected_viewer_id: "viewer-a",
  });
  expect(api.success).toHaveBeenCalledWith("Added to pathway", {
    description: "Saved to Fictional Student's action items.",
  });
});
it("resource account changes hide old students immediately and ignore departed saves", async () => {
  const view = render(<AddToPathwayButton title="Useful resource" />);
  fireEvent.click(screen.getByRole("button", { name: "Add to pathway" }));
  const button = await screen.findByRole("button", { name: "Fictional Student" });
  const pending = deferred();
  api.create.mockReturnValue(pending.promise);
  fireEvent.click(button);
  api.user = { id: "viewer-b" };
  view.rerender(<AddToPathwayButton title="Useful resource" />);
  expect(screen.queryByText("Fictional Student")).toBeNull();
  await act(async () => pending.resolve(receipt(api.create.mock.calls[0][0])));
  expect(api.success).not.toHaveBeenCalled();
});
it("resources block uncertain requests across picker close/reopen without automatic retry", async () => {
  api.create.mockResolvedValue({});
  render(<AddToPathwayButton title="Useful resource" />);
  fireEvent.click(screen.getByRole("button", { name: "Add to pathway" }));
  fireEvent.click(await screen.findByRole("button", { name: "Fictional Student" }));
  await screen.findByRole("status");
  fireEvent.click(screen.getByRole("button", { name: "Add to pathway" }));
  fireEvent.click(screen.getByRole("button", { name: "Add to pathway" }));
  await screen.findByRole("status");
  expect(screen.queryByRole("button", { name: "Fictional Student" })).toBeNull();
  expect(api.create).toHaveBeenCalledOnce();
  expect(api.success).not.toHaveBeenCalled();
});
it("partner match failures are explicit rather than silently disappearing", async () => {
  api.matches.mockRejectedValueOnce(Error("PRIVATE SQL"));
  render(<PartnerSuggestedActions studentId="student-a" />);
  await screen.findByRole("button", { name: "Refresh Suggestions" });
  expect(screen.queryByText("PRIVATE SQL")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Refresh Suggestions" }));
  await screen.findByText("Reach out to Fictional Partner");
});
it("partner additions confirm the current student and notify only after successful receipt", async () => {
  const added = vi.fn();
  render(<PartnerSuggestedActions studentId="student-a" onAdded={added} />);
  fireEvent.click(await screen.findByRole("button", { name: "Add" }));
  await act(async () => {});
  expect(added).toHaveBeenCalledOnce();
  expect(api.create.mock.calls[0][0].data).toMatchObject({
    student_id: "student-a",
    expected_viewer_id: "viewer-a",
  });
});
it("partner student changes suppress departed completion and private suggestions", async () => {
  const added = vi.fn(),
    view = render(<PartnerSuggestedActions studentId="student-a" onAdded={added} />);
  const button = await screen.findByRole("button", { name: "Add" });
  const pending = deferred();
  api.create.mockReturnValue(pending.promise);
  fireEvent.click(button);
  api.matches.mockReturnValue(new Promise(() => {}));
  view.rerender(<PartnerSuggestedActions studentId="student-b" onAdded={added} />);
  expect(screen.queryByText("Reach out to Fictional Partner")).toBeNull();
  await act(async () => pending.resolve(receipt(api.create.mock.calls[0][0])));
  expect(api.success).not.toHaveBeenCalled();
  expect(added).not.toHaveBeenCalled();
});
it("report recommendations are inert in signed-out mode even with an accidental student id", () => {
  api.user = null;
  render(<ConnectToPlan report={report()} studentId="student-a" />);
  fireEvent.click(screen.getByRole("button", { name: "Add to Actions" }));
  expect(api.create).not.toHaveBeenCalled();
});
it("report recommendations require a valid receipt before showing Added", async () => {
  api.create.mockResolvedValue({});
  render(<ConnectToPlan report={report()} studentId="student-a" />);
  fireEvent.click(screen.getByRole("button", { name: "Add to Actions" }));
  await screen.findByRole("status");
  expect(screen.queryByRole("button", { name: "Added" })).toBeNull();
  expect(api.success).not.toHaveBeenCalled();
  expect(
    (screen.getByRole("button", { name: "Add to Actions" }) as HTMLButtonElement).disabled,
  ).toBe(true);
});
it("a changed report revision resets recommendation state and suppresses an old success", async () => {
  const pending = deferred();
  api.create.mockReturnValue(pending.promise);
  const view = render(<ConnectToPlan report={report("Old next step")} studentId="student-a" />);
  fireEvent.click(screen.getByRole("button", { name: "Add to Actions" }));
  view.rerender(<ConnectToPlan report={report("Current next step")} studentId="student-a" />);
  await act(async () => pending.resolve(receipt(api.create.mock.calls[0][0])));
  expect(api.success).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Added" })).toBeNull();
  expect(screen.getByText("Current next step")).toBeTruthy();
});
