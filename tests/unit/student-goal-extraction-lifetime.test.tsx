// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ id: "student-a", auth: { user: { id: "viewer-a" }, loading: false } as any,
  student: vi.fn(), docs: vi.fn(), goals: vi.fn(), canEdit: vi.fn(), sign: vi.fn(), extract: vi.fn(), save: vi.fn(), pdf: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => api.auth }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options, useParams: () => ({ studentId: api.id }), useSearch: () => ({ tab: "documents" }), useNavigate: () => vi.fn() }), Link: ({ to, children }: any) => <a href={to}>{children}</a> }));
vi.mock("@/components/withRoleGuard", () => ({ withRoleGuard: (_roles: unknown, component: unknown) => component }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/students/FamilyDocumentUpload", () => ({ FamilyDocumentUpload: ({ docs, renderRowActions }: any) => <div>{docs.map((doc: any) => <div key={doc.id}>{renderRowActions(doc)}</div>)}</div>, StandardDocActions: ({ doc, onExtract, parsing, extractionDisabled }: any) => onExtract ? <button disabled={!!parsing || extractionDisabled} onClick={() => onExtract(doc)}>Read {doc.id}</button> : null }));
vi.mock("@/components/students/StudentProfileSupport", () => ({ StudentProfileSupport: () => null }));
vi.mock("@/components/students/StudentPathwayReportPanel", () => ({ StudentPathwayReportPanel: () => null }));
vi.mock("@/components/students/StudentPlanningTools", () => ({ StudentPlanningTools: () => null }));
vi.mock("@/lib/students.functions", () => ({ getStudent: api.student, listGoals: api.goals, canEditStudent: api.canEdit }));
vi.mock("@/lib/documents.functions", () => ({ listDocuments: api.docs, deleteDocument: vi.fn(), getDocumentSignedUrl: api.sign, extractGoalsFromText: api.extract, saveExtractedGoals: api.save }));
vi.mock("@/lib/browser-only-libs", () => ({ extractPdfText: api.pdf }));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error, info: api.info } }));
import { Route } from "../../src/routes/_authenticated/students.$studentId";
const Component = Route.options.component!;
const goal = { title: "Recorded familiar routine goal", category: "life-skills", description: "Recorded source description", measurable_criteria: "" };
function pending() { let resolve!: (value: any) => void, reject!: (error: Error) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeEach(() => {
  vi.clearAllMocks(); api.id = "student-a"; api.auth = { user: { id: "viewer-a" }, loading: false };
  api.student.mockImplementation(async ({ data }: any) => ({ id: data.id, first_name: data.id, grade_band: "9-10" }));
  api.docs.mockImplementation(async ({ data }: any) => ({ documents: [{ id: `doc-${data.student_id}`, title: "Source.pdf", mime_type: "application/pdf" }] }));
  api.goals.mockResolvedValue({ goals: [] }); api.canEdit.mockResolvedValue({ canEdit: true });
  api.sign.mockResolvedValue({ url: "https://synthetic.invalid/file" });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, blob: async () => new Blob(["fictional source"]) })));
  api.pdf.mockResolvedValue("Recorded source baseline: two steps using written directions; proposed target four.");
  api.extract.mockResolvedValue({ goals: [goal] }); api.save.mockResolvedValue({ inserted: 1 });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function read() { const button = await screen.findByRole("button", { name: `Read doc-${api.id}` }); await act(async () => fireEvent.click(button)); }
it("extracts with current viewer intent, waits for review and saves only to the current student", async () => {
  render(<Component />); await read();
  expect(api.extract).toHaveBeenCalledWith({ data: { text: expect.any(String), expected_viewer_id: "viewer-a" } }); expect(api.save).not.toHaveBeenCalled();
  expect(screen.getByText(goal.title)).toBeTruthy();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save 1 goal" })));
  expect(api.save).toHaveBeenCalledWith({ data: { student_id: "student-a", goals: [goal], expected_viewer_id: "viewer-a" } });
});
it.each(["student", "viewer", "signed-out"])("ignores a late goal extraction after %s changes", async change => {
  const request = pending(); api.extract.mockReturnValueOnce(request.promise);
  const view = render(<Component />); await read();
  if (change === "student") api.id = "student-b";
  if (change === "viewer") api.auth = { user: { id: "viewer-b" }, loading: false };
  if (change === "signed-out") api.auth = { user: null, loading: false };
  view.rerender(<Component />);
  await act(async () => request.resolve({ goals: [goal] }));
  expect(screen.queryByText(goal.title)).toBeNull(); expect(api.save).not.toHaveBeenCalled(); expect(api.info).not.toHaveBeenCalled();
});
it("removes an already displayed proposal when switching students", async () => {
  const view = render(<Component />); await read(); expect(screen.getByText(goal.title)).toBeTruthy();
  api.id = "student-b"; view.rerender(<Component />); await screen.findByRole("button", { name: "Read doc-student-b" });
  expect(screen.queryByText(goal.title)).toBeNull(); expect(screen.queryByRole("button", { name: "Save 1 goal" })).toBeNull();
});
it("does not begin AI after leaving during document download", async () => {
  const request = pending(); api.sign.mockReturnValueOnce(request.promise);
  const view = render(<Component />); await read(); api.id = "student-b"; view.rerender(<Component />);
  await act(async () => request.resolve({ url: "https://synthetic.invalid/file" }));
  expect(api.extract).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it("prevents duplicate extraction clicks before the first request finishes", async () => {
  const request = pending(); api.extract.mockReturnValueOnce(request.promise);
  render(<Component />); const button = await screen.findByRole("button", { name: "Read doc-student-a" });
  await act(async () => { fireEvent.click(button); fireEvent.click(button); });
  expect(api.extract).toHaveBeenCalledTimes(1); await act(async () => request.resolve({ goals: [goal] }));
});
it("keeps provider details out of browser errors and notices", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {}); api.extract.mockRejectedValueOnce(new Error("PRIVATE provider content"));
  render(<Component />); await read();
  expect(api.error).toHaveBeenCalledWith("We couldn't read goals from that document. Please try again.");
  expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE"); log.mockRestore();
});
it("does not extract goals with viewing access alone", async () => {
  api.canEdit.mockResolvedValue({ canEdit: false }); render(<Component />); await screen.findByRole("heading", { name: "student-a" });
  expect(screen.queryByRole("button", { name: "Read doc-student-a" })).toBeNull();
  expect(api.sign).not.toHaveBeenCalled(); expect(api.extract).not.toHaveBeenCalled();
});

it("pauses the visible review after an uncertain save and does not replay it", async () => {
  api.save.mockRejectedValueOnce(new Error("PRIVATE response was lost"));render(<Component />);await read();
  await act(async()=>fireEvent.click(screen.getByRole("button",{name:"Save 1 goal"})));
  expect(screen.getByRole("alert").textContent).toContain("Refresh this page and review the saved goals");expect(screen.getByText(goal.title)).toBeTruthy();
  for(const name of ["Save 1 goal","Remove","Cancel","Read doc-student-a"]){const button=screen.getByRole("button",{name});expect((button as HTMLButtonElement).disabled).toBe(true);await act(async()=>fireEvent.click(button));}
  expect(api.save).toHaveBeenCalledOnce();expect(api.extract).toHaveBeenCalledOnce();expect(api.success).not.toHaveBeenCalled();expect(api.error.mock.calls.flat().join(" ")).not.toContain("PRIVATE");
});
it("freezes review changes and extraction while a save is pending",async()=>{
 const request=pending();api.save.mockReturnValueOnce(request.promise);render(<Component />);await read();
 await act(async()=>fireEvent.click(screen.getByRole("button",{name:"Save 1 goal"})));
 for(const name of ["Saving…","Remove","Cancel","Read doc-student-a"])expect((screen.getByRole("button",{name}) as HTMLButtonElement).disabled).toBe(true);
 await act(async()=>request.resolve({inserted:1}));expect(api.success).toHaveBeenCalledWith("Added 1 goal.");expect(screen.queryByText(goal.title)).toBeNull();
});
it("cannot save the prior proposal while another extraction is pending",async()=>{
 render(<Component />);await read();const request=pending();api.extract.mockReturnValueOnce(request.promise);await read();
 expect((screen.getByRole("button",{name:"Save 1 goal"}) as HTMLButtonElement).disabled).toBe(true);await act(async()=>fireEvent.click(screen.getByRole("button",{name:"Save 1 goal"})));expect(api.save).not.toHaveBeenCalled();await act(async()=>request.resolve({goals:[goal]}));
});
it.each(["student","viewer"])("does not apply a departed save to the new %s review",async change=>{
 const request=pending();api.save.mockReturnValueOnce(request.promise);const view=render(<Component />);await read();await act(async()=>fireEvent.click(screen.getByRole("button",{name:"Save 1 goal"})));
 if(change==="student")api.id="student-b";else api.auth={user:{id:"viewer-b"},loading:false};view.rerender(<Component />);await read();
 await act(async()=>request.resolve({inserted:1}));expect(api.success).not.toHaveBeenCalled();expect(screen.getByText(goal.title)).toBeTruthy();expect((screen.getByRole("button",{name:"Save 1 goal"}) as HTMLButtonElement).disabled).toBe(false);
});
