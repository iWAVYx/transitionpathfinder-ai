// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ id: "meeting-a", get: vi.fn(), update: vi.fn(), student: vi.fn(), templates: vi.fn(), deniedWrite: vi.fn(() => { throw new Error("No record writes during export checks"); }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options, useParams: () => ({ meetingId: state.id }) }), Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }));
vi.mock("@/components/withRoleGuard", () => ({ withRoleGuard: (_roles: unknown, component: unknown) => component }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/pathway/ExtractEvidenceButton", () => ({ ExtractEvidenceButton: () => <button>Extract evidence</button> }));
vi.mock("@/lib/students.functions", () => ({ getStudent: state.student }));
vi.mock("@/lib/meeting-templates.functions", () => ({ listMeetingTemplates: state.templates, applyMeetingTemplate: state.deniedWrite, setAgendaItemCompleted: state.deniedWrite, deleteAgendaItem: state.deniedWrite }));
vi.mock("@/lib/meetings.functions", () => ({ getMeeting: state.get, updateMeeting: state.update, completeMeeting: state.deniedWrite, addAgendaItem: state.deniedWrite, addQuestion: state.deniedWrite, addActionItem: state.deniedWrite, setActionStatus: state.deniedWrite }));
import { Route } from "@/routes/_authenticated/meetings.$meetingId";
const Component = Route.options.component!;
function record(id: string) {
  return { meeting: { id, student_id: "fictional-student", title: `Fictional ${id}`, kind: "PPT", status: "upcoming", scheduled_at: null, location: null,
    student_voice: "I want to try the next step with support.\n".repeat(60) + "Final student statement.", family_concerns: "Recorded family priorities", teacher_notes: "Dated educator observation", summary: "Recorded discussion", decisions: "Recorded decision", documents_to_update: "Recorded document update", next_meeting_date: "2026-11-02" },
    agenda: [{ id: "agenda", title: "Review the recorded goal", notes: "Dated agenda note", completed: true }],
    questions: [{ id: "question", asker_role: "family", question: "Who will document progress?", answer: "The team agreed to dated observations." }],
    actions: [{ id: "action", title: "Bring the observation", status: "in-progress", assignee_role: "educator", due_date: "2026-10-20" }] };
}
beforeEach(() => { state.id = "meeting-a"; state.templates.mockResolvedValue({ templates: [] }); });
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); });
it("actual meeting document includes every saved field and follow-up without writing records", async () => {
  const data = record(state.id); state.get.mockResolvedValue(data);
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  const { container } = render(<Component />);
  await screen.findByRole("heading", { name: "Fictional Meeting-A" });
  const values = Array.from(container.querySelectorAll("[data-document-field-value]")).map(el => el.textContent);
  for (const key of ["student_voice", "family_concerns", "teacher_notes", "summary", "decisions", "documents_to_update", "next_meeting_date"] as const) expect(values).toContain(data.meeting[key]);
  expect(screen.getByText(data.questions[0].answer, { exact: false })).toBeTruthy();
  expect(container.querySelector("[data-meeting-action-status]")?.textContent).toBe("In progress");
  expect(container.querySelector("[data-meeting-agenda-status]")?.textContent).toBe("Completed");
  expect(screen.getByText("Who: Educator · Due: 2026-10-20")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Export summary" }));
  expect(print).toHaveBeenCalledOnce(); expect(state.update).not.toHaveBeenCalled(); expect(state.deniedWrite).not.toHaveBeenCalled();
});
it.each([false, true])("ignores a superseded meeting response (failure=%s)", async failure => {
  let resolveOld!: (value: unknown) => void; let rejectOld!: (error: Error) => void;
  state.get.mockImplementation(({ data }: any) => data.id === "meeting-a" ? new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject; }) : Promise.resolve(record(data.id)));
  const view = render(<Component />);
  state.id = "meeting-b"; view.rerender(<Component />);
  await screen.findByRole("heading", { name: "Fictional Meeting-B" });
  await act(async () => { if (failure) rejectOld(new Error("Old meeting failed")); else resolveOld(record("meeting-a")); });
  expect(screen.getByRole("heading", { name: "Fictional Meeting-B" })).toBeTruthy();
  expect(screen.queryByText("Old meeting failed")).toBeNull(); expect(screen.queryByRole("heading", { name: "Fictional Meeting-A" })).toBeNull();
});
it("hides the previous document and export action while the next meeting loads", async () => {
  state.get.mockResolvedValueOnce(record("meeting-a")).mockReturnValue(new Promise(() => {}));
  const view = render(<Component />); await screen.findByRole("heading", { name: "Fictional Meeting-A" });
  state.id = "meeting-b"; view.rerender(<Component />);
  expect(screen.queryByRole("button", { name: "Export summary" })).toBeNull(); expect(screen.queryByText("Recorded decision")).toBeNull(); expect(screen.getByText("Loading…")).toBeTruthy();
});
it("does not display a response belonging to a different meeting", async () => {
  state.get.mockResolvedValue(record("wrong-meeting")); render(<Component />);
  await screen.findByRole("heading", { name: "We couldn't open this meeting" });
  expect(screen.queryByRole("button", { name: "Export summary" })).toBeNull();
});

it("ignores a profile pull that finishes after changing meetings", async () => {
  let finishProfile!: (value: unknown) => void;
  const first = record("meeting-a");
  first.meeting.student_voice = first.meeting.family_concerns = first.meeting.teacher_notes = "";
  state.get.mockImplementation(({ data }: any) => Promise.resolve(data.id === "meeting-a" ? first : record(data.id)));
  state.student.mockReturnValue(new Promise(resolve => { finishProfile = resolve; }));
  const view = render(<Component />); await screen.findByRole("heading", { name: "Fictional Meeting-A" });
  fireEvent.click(screen.getByRole("button", { name: "Pull from profile" }));
  state.id = "meeting-b"; view.rerender(<Component />);
  await screen.findByRole("heading", { name: "Fictional Meeting-B" });
  await act(async () => { finishProfile({ student_voice_statement: "Old profile response", family_priorities: "Old family input", support_needs_summary: "Old support input" }); });
  expect(state.update).not.toHaveBeenCalled(); expect(screen.queryByText("Old profile response")).toBeNull();
  expect(screen.getByRole("heading", { name: "Fictional Meeting-B" })).toBeTruthy();
});
