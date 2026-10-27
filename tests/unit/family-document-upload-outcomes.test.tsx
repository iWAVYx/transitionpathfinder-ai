// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ register: vi.fn(), preflight: vi.fn(), upload: vi.fn(), refresh: vi.fn(), success: vi.fn(), info: vi.fn(), error: vi.fn(), file: null as any, reviewConfirm: null as any }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: any) => <a>{children}</a> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ upload: api.upload }) } } }));
vi.mock("@/lib/documents.functions", () => ({ registerDocument: api.register, assertCanUploadForStudent: api.preflight }));
vi.mock("@/lib/protected-file-uploads", () => ({ PROTECTED_FILE_UPLOADS_ENABLED: true, PROTECTED_FILE_UPLOADS_MESSAGE: "Paused" }));
vi.mock("@/components/privacy/SensitiveFilePrivacyReviewDialog", () => ({ SensitiveFilePrivacyReviewDialog: ({ source, onConfirm }: any) => {
  if (source) api.reviewConfirm = onConfirm;
  return source ? <button onClick={() => onConfirm({ file: api.file })}>Approve fictional copy</button> : null;
} }));
vi.mock("@/components/students/DocumentPermissionsDialog", () => ({ DocumentPermissionsDialog: () => null }));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error, info: api.info } }));
import { FamilyDocumentUpload } from "../../src/components/students/FamilyDocumentUpload";
import { DOCUMENT_UPLOAD_UNCONFIRMED } from "../../src/lib/document-upload-outcome";
const student = "11111111-1111-4111-8111-111111111111";
function receipt(patch: object = {}) { return { id: "22222222-2222-4222-8222-222222222222", student_id: student,
  storage_path: `${student}/123-privacy-safe-document.txt`, scan_status: "clean", review_status: "pending_review", archived_at: null, deleted_at: null, ...patch }; }
function pending() { let resolve!: (value: any) => void, reject!: (error: Error) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeEach(() => {
  vi.resetAllMocks(); vi.spyOn(Date, "now").mockReturnValue(123);
  api.file = new File(["Fictional reviewed routine: two steps using written directions."], "privacy-safe-document.txt", { type: "text/plain" });
  api.preflight.mockResolvedValue({ ok: true }); api.upload.mockResolvedValue({ error: null }); api.register.mockResolvedValue(receipt()); api.refresh.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function open() {
  const view = render(<FamilyDocumentUpload viewerId="current-viewer" studentId={student} studentFirstName="Fictional" docs={[]} onChange={api.refresh} />);
  fireEvent.change(screen.getByLabelText("Short title (optional)"), { target: { value: "Fictional planning notes" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Acknowledge privacy notice" }));
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(input, { target: { files: [api.file] } });
  return { ...view, input, approve: () => fireEvent.click(screen.getByRole("button", { name: "Approve fictional copy" })) };
}
it("reports a persisted clean scan as saved without claiming educational approval or summary completion", async () => {
  const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.success).toHaveBeenCalledWith("Document saved. Review its status in the document list."));
  expect(api.refresh).toHaveBeenCalledOnce(); expect(api.error).not.toHaveBeenCalled();
  expect((screen.getByLabelText("Short title (optional)") as HTMLInputElement).value).toBe("");
});
it("reports a pending security review without success or readiness wording", async () => {
  api.register.mockResolvedValue(receipt({ scan_status: "pending" })); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.info).toHaveBeenCalledWith(expect.stringContaining("security review is not yet confirmed")));
  expect(api.success).not.toHaveBeenCalled(); expect(api.refresh).toHaveBeenCalledOnce();
});
it.each([
  { scan_status: "failed" }, { scan_status: "infected" }, { scan_status: "deleted" },
  { review_status: "rejected" }, { archived_at: "2026-10-27" }, { deleted_at: "2026-10-27" },
])("does not congratulate a blocked or archived upload (%j)", async patch => {
  api.register.mockResolvedValue(receipt(patch)); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.error).toHaveBeenCalledWith("This file could not be cleared for use. Review its status before trying again."));
  expect(api.success).not.toHaveBeenCalled(); expect(api.info).not.toHaveBeenCalled(); expect(api.refresh).toHaveBeenCalledOnce();
});
it.each([null, {}, receipt({ student_id: "33333333-3333-4333-8333-333333333333" }), receipt({ storage_path: "another-file" }), receipt({ scan_status: "unknown" })])("pauses an unconfirmed receipt without clearing or replaying the upload (%j)", async value => {
  api.register.mockResolvedValue(value); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(DOCUMENT_UPLOAD_UNCONFIRMED));
  expect(view.input.disabled).toBe(true); expect(api.refresh).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled();
  expect((screen.getByLabelText("Short title (optional)") as HTMLInputElement).value).toBe("Fictional planning notes");
  expect(api.upload).toHaveBeenCalledOnce(); expect(api.register).toHaveBeenCalledOnce();
});
it.each(["storage", "registration"])("does not expose or replay an uncertain %s error", async stage => {
  if (stage === "storage") api.upload.mockResolvedValue({ error: { message: "PRIVATE object path and filename" } });
  else api.register.mockRejectedValue(new Error("PRIVATE database details"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {}); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(DOCUMENT_UPLOAD_UNCONFIRMED));
  expect(api.success).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled(); expect(api.error.mock.calls.flat().join(" ")).not.toContain("PRIVATE");
  expect(api.upload).toHaveBeenCalledOnce(); expect(api.register).toHaveBeenCalledTimes(stage === "storage" ? 0 : 1); expect(view.input.disabled).toBe(true);
});
it("distinguishes a list refresh failure from an uncertain upload", async () => {
  api.refresh.mockRejectedValue(new Error("PRIVATE read error")); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.error).toHaveBeenCalledWith(expect.stringContaining("document list couldn't be refreshed")));
  expect(api.success).toHaveBeenCalledOnce(); expect(screen.queryByRole("alert")).toBeNull(); expect(view.input.disabled).toBe(false);
  expect(api.register).toHaveBeenCalledOnce();
});
it("stops before storage on permission failure and uses a friendly error", async () => {
  api.preflight.mockRejectedValue(new Error("PRIVATE access detail")); const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.error).toHaveBeenCalledWith(expect.stringContaining("couldn't confirm permission to upload")));
  expect(api.upload).not.toHaveBeenCalled(); expect(api.register).not.toHaveBeenCalled(); expect(view.input.disabled).toBe(false);
});
it("blocks two synchronous confirmations before React updates busy state", async () => {
  const request = pending(); api.preflight.mockReturnValueOnce(request.promise); const view = open();
  const button = screen.getByRole("button", { name: "Approve fictional copy" });
  await act(async () => { fireEvent.click(button); fireEvent.click(button); });
  expect(api.preflight).toHaveBeenCalledOnce(); expect(api.upload).not.toHaveBeenCalled();
  await act(async () => request.resolve({ ok: true })); await waitFor(() => expect(api.register).toHaveBeenCalledOnce());
});
it("keeps upload controls absent for read-only users", () => {
  const view = render(<FamilyDocumentUpload viewerId="current-viewer" studentId={student} docs={[]} canEdit={false} onChange={api.refresh} />);
  expect(view.container.querySelector('input[type="file"]')).toBeNull(); expect(api.upload).not.toHaveBeenCalled();
});

function depart(view: ReturnType<typeof open>, change: string) {
  if (change === "leave") { view.unmount(); return; }
  view.rerender(<FamilyDocumentUpload viewerId={change === "account" ? "other-viewer" : "current-viewer"}
    studentId={change === "student" ? "33333333-3333-4333-8333-333333333333" : student}
    studentFirstName="New session" canEdit={change !== "access"} docs={[]} onChange={api.refresh} />);
}
it("binds both upload checks to the viewer who approved this file", async () => {
  const view = open(); await act(async () => view.approve());
  await waitFor(() => expect(api.register).toHaveBeenCalledOnce());
  expect(api.preflight).toHaveBeenCalledWith({ data: { student_id: student, expected_viewer_id: "current-viewer" } });
  expect(api.register.mock.calls[0][0].data).toMatchObject({ student_id: student, expected_viewer_id: "current-viewer" });
});
it.each([null, {}, { ok: false }])("does not store bytes without a confirmed preflight (%j)", async result => {
  api.preflight.mockResolvedValue(result); const view = open(); await act(async () => view.approve());
  expect(api.upload).not.toHaveBeenCalled(); expect(api.register).not.toHaveBeenCalled();
  expect(api.error).toHaveBeenCalledWith(expect.stringContaining("couldn't confirm permission to upload"));
});
it.each(["preflight", "storage", "registration"].flatMap(stage => ["student", "account", "access", "leave"].map(change => [stage, change])))
("stops after a departed %s request when %s changes", async (stage, change) => {
  const request = pending();
  if (stage === "preflight") api.preflight.mockReturnValueOnce(request.promise);
  if (stage === "storage") api.upload.mockReturnValueOnce(request.promise);
  if (stage === "registration") api.register.mockReturnValueOnce(request.promise);
  const view = open(); await act(async () => view.approve());
  await act(async () => depart(view, change));
  await act(async () => request.resolve(stage === "preflight" ? { ok: true } : stage === "storage" ? { error: null } : receipt()));
  expect(api.upload).toHaveBeenCalledTimes(stage === "preflight" ? 0 : 1);
  expect(api.register).toHaveBeenCalledTimes(stage === "registration" ? 1 : 0);
  expect(api.refresh).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled(); expect(api.info).not.toHaveBeenCalled(); expect(api.error).not.toHaveBeenCalled();
  if (["student", "account"].includes(change)) expect((screen.getByLabelText("Short title (optional)") as HTMLInputElement).value).toBe("");
});
it.each(["preflight", "storage", "registration"])("ignores a late %s rejection after leaving", async stage => {
  const request = pending();
  if (stage === "preflight") api.preflight.mockReturnValueOnce(request.promise);
  if (stage === "storage") api.upload.mockReturnValueOnce(request.promise);
  if (stage === "registration") api.register.mockReturnValueOnce(request.promise);
  const view = open(); await act(async () => view.approve()); view.unmount();
  await act(async () => request.reject(new Error("PRIVATE late failure")));
  expect(api.error).not.toHaveBeenCalled(); expect(api.refresh).not.toHaveBeenCalled();
});
it.each(["student", "account", "access", "leave"])("rejects the old privacy approval callback after %s changes", async change => {
  const view = open(); const oldConfirm = api.reviewConfirm;
  await act(async () => depart(view, change));
  await act(async () => oldConfirm({ file: api.file }));
  expect(api.preflight).not.toHaveBeenCalled(); expect(api.upload).not.toHaveBeenCalled(); expect(api.register).not.toHaveBeenCalled();
});
it("does not report a late list-refresh failure in the new account session", async () => {
  const request = pending(); api.refresh.mockReturnValueOnce(request.promise);
  const view = open(); await act(async () => view.approve());
  expect(api.success).toHaveBeenCalledOnce(); await act(async () => depart(view, "account")); api.success.mockClear();
  await act(async () => request.reject(new Error("PRIVATE late refresh failure")));
  expect(api.error).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled();
});
