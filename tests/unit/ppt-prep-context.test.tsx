// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ id: "prep-a" as string | undefined, get: vi.fn(), list: vi.fn(), preps: vi.fn(), navigate: vi.fn(), error: vi.fn(), deniedWrite: vi.fn(() => { throw new Error("No writes during reader checks"); }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({ id: state.id }) }), useNavigate: () => state.navigate, Link: ({ children, to }: any) => <a href={to}>{children}</a> }));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => children }));
vi.mock("@/lib/route-role-guard", () => ({ ensureRoleAccess: vi.fn() }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/site/Term", () => ({ Term: ({ children }: any) => children, GLOSSARY: {} }));
vi.mock("@/components/pathway/PreMeetingChecklist", () => ({ PreMeetingChecklist: () => null }));
vi.mock("@/components/pathway/MeetingPrepPartners", () => ({ MeetingPrepPartners: () => null }));
vi.mock("@/components/documents/PptAgendaDocument", () => ({ PptAgendaDocument: ({ name, agenda }: any) => <section><h1>{name}</h1><p>{agenda.opening_note}</p><button>Print Guide</button></section> }));
vi.mock("@/lib/pathway.functions", () => ({ listMyReports: state.list }));
vi.mock("@/lib/ppt.functions", () => ({ getPptPrep: state.get, listPptPreps: state.preps, createPptPrep: state.deniedWrite, deletePptPrep: state.deniedWrite }));
vi.mock("@/lib/action-items.functions", () => ({ createStudentActionItem: state.deniedWrite }));
vi.mock("sonner", () => ({ toast: { error: state.error, success: vi.fn() } }));
import { Route } from "@/routes/_authenticated/ppt-prep";
const Component = Route.options.component!;
const record = (id: string) => ({ id, agenda: { opening_note: `Notes for ${id}` }, studentName: `Student ${id}`, studentId: `student-${id}`, meetingDate: null });
beforeEach(() => { state.id = "prep-a"; state.list.mockResolvedValue({ reports: [] }); state.preps.mockResolvedValue({ preps: [] }); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it.each([false, true])("keeps the selected guide when an older load settles (failure=%s)", async failure => {
  let resolveOld!: (value: unknown) => void; let rejectOld!: (error: Error) => void;
  state.get.mockImplementation(({ data }: any) => data.id === "prep-a" ? new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject; }) : Promise.resolve(record(data.id)));
  const view = render(<Component />);
  state.id = "prep-b"; view.rerender(<Component />);
  await screen.findByRole("heading", { name: "Student prep-b" });
  await act(async () => { if (failure) rejectOld(new Error("Older load failed")); else resolveOld(record("prep-a")); });
  expect(screen.getByText("Notes for prep-b")).toBeTruthy();
  expect(screen.queryByText("Notes for prep-a")).toBeNull();
  expect(state.error).not.toHaveBeenCalled(); expect(state.navigate).not.toHaveBeenCalled();
  expect(state.deniedWrite).not.toHaveBeenCalled();
});
it("hides the previous guide and print control until the selected guide arrives", async () => {
  let finishNext!: (value: unknown) => void;
  state.get.mockResolvedValueOnce(record("prep-a")).mockReturnValueOnce(new Promise(resolve => { finishNext = resolve; }));
  const view = render(<Component />); await screen.findByText("Notes for prep-a");
  state.id = "prep-b"; view.rerender(<Component />);
  expect(screen.queryByRole("button", { name: "Print Guide" })).toBeNull(); expect(screen.queryByText("Notes for prep-a")).toBeNull();
  expect(screen.getByText("Loading your meeting prep…")).toBeTruthy();
  await act(async () => { finishNext(record("prep-b")); });
  expect(screen.getByText("Notes for prep-b")).toBeTruthy();
});
it.each([false, true])("clearing the saved selection ignores its pending request (failure=%s)", async failure => {
  let resolveOld!: (value: unknown) => void; let rejectOld!: (error: Error) => void;
  state.get.mockReturnValue(new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject; }));
  const view = render(<Component />); state.id = undefined; view.rerender(<Component />);
  await act(async () => { if (failure) rejectOld(new Error("Older load failed")); else resolveOld(record("prep-a")); });
  expect(screen.queryByRole("button", { name: "Print Guide" })).toBeNull(); expect(screen.queryByText("Loading your meeting prep…")).toBeNull();
  expect(state.error).not.toHaveBeenCalled(); expect(state.navigate).not.toHaveBeenCalled();
});
it("rejects a response for a different guide", async () => {
  state.get.mockResolvedValue(record("wrong-prep")); render(<Component />);
  await act(async () => {});
  expect(screen.queryByRole("button", { name: "Print Guide" })).toBeNull(); expect(screen.queryByText("Notes for wrong-prep")).toBeNull();
  expect(state.error).toHaveBeenCalledWith("Couldn't load that meeting prep.");
  expect(state.navigate).toHaveBeenCalledWith({ to: "/ppt-prep", search: {} });
});
it("an older request cannot end the selected guide's loading state", async () => {
  let finishOld!: (value: unknown) => void; let finishNext!: (value: unknown) => void;
  state.get.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; }))
    .mockReturnValueOnce(new Promise(resolve => { finishNext = resolve; }));
  const view = render(<Component />); state.id = "prep-b"; view.rerender(<Component />);
  await act(async () => { finishOld(record("prep-a")); });
  expect(screen.getByText("Loading your meeting prep…")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Print Guide" })).toBeNull();
  await act(async () => { finishNext(record("prep-b")); });
  expect(screen.getByText("Notes for prep-b")).toBeTruthy();
});

const accessibleReport = { id: "report-a", student_first_name: "Sample Student", grade_band: "11-12", created_at: "2026-10-12T12:00:00Z" };
it.each(["flag", "rejection"])("report load %s is not shown as an empty library and recovers without generation", async failure => {
  state.id = undefined;
  if (failure === "flag") state.list.mockResolvedValueOnce({ reports: [], loadFailed: true });
  else state.list.mockRejectedValueOnce(new Error("Unavailable"));
  state.list.mockResolvedValueOnce({ reports: [accessibleReport], loadFailed: false });
  render(<Component />);
  await screen.findByText("Your Pathway Reports could not be loaded. Please try again.");
  expect(screen.queryByRole("link", { name: "Create a Pathway Report" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Generate meeting prep" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reload Pathway Reports" }));
  await screen.findByRole("combobox", { name: "Pathway Report to build from" });
  expect(screen.queryByText("Your Pathway Reports could not be loaded. Please try again.")).toBeNull();
  expect((screen.getByRole("button", { name: "Generate meeting prep" }) as HTMLButtonElement).disabled).toBe(true);
  expect(state.deniedWrite).not.toHaveBeenCalled(); expect(state.list).toHaveBeenCalledTimes(2);
});
it.each(["flag", "rejection"])("saved-history %s can retry without discarding meeting notes", async failure => {
  state.id = undefined; state.list.mockResolvedValue({ reports: [accessibleReport], loadFailed: false });
  if (failure === "flag") state.preps.mockResolvedValueOnce({ preps: [], loadFailed: true });
  else state.preps.mockRejectedValueOnce(new Error("Unavailable"));
  state.preps.mockResolvedValueOnce({ preps: [{ id: "saved-prep", student_name: "Recovery Student", meeting_date: null, created_at: "2026-10-12T12:00:00Z" }], loadFailed: false });
  render(<Component />); await screen.findByText("Your saved meeting preps could not be loaded. Please try again.");
  fireEvent.change(screen.getByLabelText("What's on your mind going in?"), { target: { value: "Preserved meeting concern" } });
  fireEvent.click(screen.getByRole("button", { name: "Reload Saved Meeting Preps" }));
  await screen.findByRole("link", { name: /Recovery Student/ });
  expect((screen.getByLabelText("What's on your mind going in?") as HTMLTextAreaElement).value).toBe("Preserved meeting concern");
  expect(state.list).toHaveBeenCalledTimes(1); expect(state.preps).toHaveBeenCalledTimes(2); expect(state.deniedWrite).not.toHaveBeenCalled();
});
it("report and history failures recover independently", async () => {
  state.id = undefined; state.list.mockResolvedValueOnce({ reports: [], loadFailed: true }).mockResolvedValueOnce({ reports: [accessibleReport], loadFailed: false });
  state.preps.mockResolvedValue({ preps: [], loadFailed: true });
  render(<Component />); await screen.findByRole("button", { name: "Reload Pathway Reports" });
  await screen.findByRole("button", { name: "Reload Saved Meeting Preps" });
  fireEvent.click(screen.getByRole("button", { name: "Reload Pathway Reports" }));
  await screen.findByRole("combobox", { name: "Pathway Report to build from" });
  expect(screen.getByRole("button", { name: "Reload Saved Meeting Preps" })).toBeTruthy();
  expect(state.preps).toHaveBeenCalledTimes(1); expect(state.deniedWrite).not.toHaveBeenCalled();
});
it("a successful empty report library retains its honest first-report action", async () => {
  state.id = undefined; state.list.mockResolvedValue({ reports: [], loadFailed: false });
  render(<Component />); await screen.findByRole("link", { name: "Create a Pathway Report" });
  expect(screen.queryByRole("button", { name: "Reload Pathway Reports" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Generate meeting prep" })).toBeNull();
});
