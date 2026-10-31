// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ auth: { user: { id: "viewer-a" }, loading: false } as any, text: vi.fn(), doc: vi.fn(), success: vi.fn(), info: vi.fn(), error: vi.fn(), done: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => api.auth }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/report-evidence/extract.functions", () => ({ extractEvidenceFromText: api.text, extractEvidenceFromDocument: api.doc }));
vi.mock("sonner", () => ({ toast: { success: api.success, info: api.info, error: api.error } }));
import { ExtractEvidenceButton } from "../../src/components/pathway/ExtractEvidenceButton";
const text = "Reported baseline: two routine steps with written directions; proposed target four.";
const props = { mode: "text" as const, studentId: "student-a", sourceKind: "note" as const, sourceLabel: "Reported observation", getText: () => text, onDone: api.done };
function pending() { let resolve!: (value: any) => void, reject!: (error: Error) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeEach(() => { vi.clearAllMocks(); api.auth = { user: { id: "viewer-a" }, loading: false }; api.text.mockResolvedValue({ extracted: 1, inserted: 1 }); api.doc.mockResolvedValue({ extracted: 1, inserted: 1 }); });
afterEach(cleanup);
it("sends viewer intent and the latest source text once", async () => {
  render(<ExtractEvidenceButton {...props} />);
  await act(async () => fireEvent.click(screen.getByRole("button")));
  expect(api.text).toHaveBeenCalledWith({ data: expect.objectContaining({ expected_viewer_id: "viewer-a", student_id: "student-a", text }) }); expect(api.done).toHaveBeenCalledTimes(1);
});
it("sends viewer intent for document extraction", async () => {
  render(<ExtractEvidenceButton mode="document" documentId="doc-a" onDone={api.done} />);
  await act(async () => fireEvent.click(screen.getByRole("button")));
  expect(api.doc).toHaveBeenCalledWith({ data: { document_id: "doc-a", expected_viewer_id: "viewer-a" } });
});
it("blocks repeated clicks while extraction is pending", async () => {
  const request = pending(); api.text.mockReturnValue(request.promise);
  render(<ExtractEvidenceButton {...props} />);
  act(() => { fireEvent.click(screen.getByRole("button")); fireEvent.click(screen.getByRole("button")); });
  expect(api.text).toHaveBeenCalledTimes(1);
  await act(async () => request.resolve({ extracted: 1, inserted: 1 })); expect(api.done).toHaveBeenCalledTimes(1);
});
it.each(["student", "viewer", "source", "signed-out", "unmount"])("ignores late results after a %s change", async change => {
  const request = pending(); api.text.mockReturnValueOnce(request.promise);
  const view = render(<ExtractEvidenceButton {...props} />);
  act(() => fireEvent.click(screen.getByRole("button")));
  if (change === "viewer") api.auth = { user: { id: "viewer-b" }, loading: false };
  if (change === "signed-out") api.auth = { user: null, loading: false };
  if (change === "unmount") view.unmount(); else view.rerender(<ExtractEvidenceButton {...props} studentId={change === "student" ? "student-b" : "student-a"} sourceLabel={change === "source" ? "Another observation" : props.sourceLabel} />);
  await act(async () => request.resolve({ extracted: 1, inserted: 1 }));
  expect(api.done).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled(); expect(api.info).not.toHaveBeenCalled();
});
it("ignores a departed error and keeps current provider errors generic", async () => {
  const request = pending(); api.text.mockReturnValueOnce(request.promise);
  const view = render(<ExtractEvidenceButton {...props} />); act(() => fireEvent.click(screen.getByRole("button")));
  view.rerender(<ExtractEvidenceButton {...props} studentId="student-b" />);
  await act(async () => request.reject(new Error("PRIVATE departed source"))); expect(api.error).not.toHaveBeenCalled();
  api.text.mockRejectedValueOnce(new Error("PRIVATE current source"));
  await act(async () => fireEvent.click(screen.getByRole("button")));
  expect(api.error).toHaveBeenCalledWith("We couldn't extract evidence. Please refresh and try again.");
});
it("does not expose extraction while authentication is loading or absent", () => {
  api.auth = { user: null, loading: false }; const view = render(<ExtractEvidenceButton {...props} />); expect(screen.queryByRole("button")).toBeNull();
  api.auth = { user: { id: "viewer-a" }, loading: true }; view.rerender(<ExtractEvidenceButton {...props} />); expect(screen.queryByRole("button")).toBeNull();
});
